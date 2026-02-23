import play, { SoundCloudTrack, SoundCloudPlaylist } from 'play-dl';
import youtubeDl from 'youtube-dl-exec';
import { StreamType } from '@discordjs/voice';
import type { Readable } from 'stream';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import type { User } from 'discord.js';
import { container } from '@sapphire/framework';
import { AudioSource, type Track, type ResolveResult } from './types';
import { rootDir } from './constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string = require('ffmpeg-static');

const YOUTUBE_VIDEO_ID_REGEX = /(?:(?:music\.)?youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_PLAYLIST_REGEX = /(?:(?:music\.)?youtube\.com\/(?:playlist\?|watch\?.*&?)list=)([a-zA-Z0-9_-]+)/;

/** Path to optional cookies.txt for age-restricted YouTube content */
const COOKIES_PATH = join(rootDir, 'cookies.txt');
const hasCookies = existsSync(COOKIES_PATH);

if (hasCookies) {
	console.log('[yt-dlp] cookies.txt detected — age-restricted YouTube content enabled');
} else {
	console.log('[yt-dlp] No cookies.txt found — age-restricted YouTube content will be skipped');
}

/** Shared yt-dlp options: Node.js runtime + optional cookies for age-restricted content */
const YT_DLP_BASE = {
	jsRuntimes: 'node',
	...(hasCookies ? { cookies: COOKIES_PATH } : {})
} as const;

export class AudioSourceResolver {
	private scInitialized = false;

	/** Ensure SoundCloud client_id is set (required for search/API calls). */
	private async ensureSoundCloud(): Promise<void> {
		if (this.scInitialized) return;
		try {
			const clientId = await play.getFreeClientID();
			await play.setToken({ soundcloud: { client_id: clientId } });
			this.scInitialized = true;
			container.logger.debug('[play-dl] SoundCloud client_id initialized');
		} catch (err) {
			container.logger.error(`[play-dl] Failed to initialize SoundCloud: ${err}`);
			throw new Error('Failed to initialize SoundCloud. Please try again later.');
		}
	}

	public async detectSource(input: string): Promise<AudioSource> {
		// 1. Check YouTube via play-dl validator
		const ytValidation = play.yt_validate(input);
		if (ytValidation === 'video' || ytValidation === 'playlist') {
			return AudioSource.YouTube;
		}

		// 2. Fallback: detect YouTube URLs that play-dl missed (extra params, etc.)
		if (YOUTUBE_VIDEO_ID_REGEX.test(input) || YOUTUBE_PLAYLIST_REGEX.test(input)) {
			return AudioSource.YouTube;
		}

		// 3. Spotify — only for actual Spotify URLs (track/playlist/album), NOT plain text
		const spResult = play.sp_validate(input);
		if (spResult === 'track' || spResult === 'playlist' || spResult === 'album') {
			return AudioSource.Spotify;
		}

		// 4. SoundCloud — only for actual SoundCloud URLs (track/playlist), NOT plain text
		await this.ensureSoundCloud();
		const soResult = await play.so_validate(input);
		if (soResult === 'track' || soResult === 'playlist') {
			return AudioSource.SoundCloud;
		}

		// 5. Everything else: YouTube search
		return AudioSource.Search;
	}

	/** Search YouTube via yt-dlp. Returns up to `limit` results. */
	public async searchYouTube(query: string, limit = 5): Promise<{ id: string; title: string; duration: number; thumbnail: string }[]> {
		const info = (await youtubeDl(`ytsearch${limit}:${query}`, {
			dumpSingleJson: true,
			noWarnings: true,
			noCheckCertificates: true,
			skipDownload: true,
			flatPlaylist: true,
			...YT_DLP_BASE
		})) as { entries?: { id?: string; title?: string; duration?: number; thumbnail?: string; thumbnails?: { url: string }[] }[] };

		if (!info.entries || info.entries.length === 0) return [];

		return info.entries
			.filter((e) => e.id)
			.map((e) => ({
				id: e.id!,
				title: e.title ?? 'Unknown',
				duration: e.duration ?? 0,
				thumbnail: e.thumbnail ?? e.thumbnails?.[0]?.url ?? ''
			}));
	}

	public async resolve(input: string, requester: User): Promise<ResolveResult> {
		const source = await this.detectSource(input);

		switch (source) {
			case AudioSource.YouTube:
				return this.resolveYouTube(input, requester);
			case AudioSource.Spotify:
				return this.resolveSpotify(input, requester);
			case AudioSource.SoundCloud:
				return this.resolveSoundCloud(input, requester);
			case AudioSource.Search:
				return this.resolveSearch(input, requester);
		}
	}

	public async getStream(url: string): Promise<{ stream: Readable; type: StreamType }> {
		// YouTube: use yt-dlp (most reliable YouTube audio extractor)
		if (url.includes('youtube.com') || url.includes('youtu.be')) {
			container.logger.debug(`[yt-dlp] Streaming: ${url}`);

			const proc = youtubeDl.exec(url, {
				format: 'bestaudio',
				output: '-',
				...YT_DLP_BASE
			});

			// youtube-dl-exec (via tinyspawn) makes the ChildProcess also a Promise.
			// When we kill the process on skip/stop, tinyspawn rejects this promise.
			// Catch it to prevent unhandled rejection crash.
			(proc as unknown as Promise<unknown>).catch(() => {});

			if (!proc.stdout) {
				throw new Error('Failed to start yt-dlp process');
			}

			// Capture stderr for diagnostics
			let stderrData = '';
			if (proc.stderr) {
				proc.stderr.on('data', (chunk: Buffer) => {
					stderrData += chunk.toString();
				});
			}

			const stream = proc.stdout as Readable;
			let receivedData = false;

			stream.on('data', () => {
				if (!receivedData) {
					receivedData = true;
					container.logger.debug('[yt-dlp] Receiving audio data...');
				}
			});

			// Kill yt-dlp process when stream is closed (skip/stop/track end)
			const killProc = () => {
				if (!proc.killed) proc.kill();
			};
			stream.on('close', killProc);
			stream.on('end', killProc);

			// Prevent unhandled error events from crashing the process
			stream.on('error', (err) => {
				container.logger.error(`[yt-dlp] Stream error: ${err.message}`);
				killProc();
			});

			proc.on('error', (err) => {
				container.logger.error(`[yt-dlp] Process error: ${err.message}`);
				killProc();
			});

			proc.on('close', (code) => {
				if (code !== 0 && code !== null) {
					container.logger.error(`[yt-dlp] Exited with code ${code}. stderr: ${stderrData.trim()}`);
				}
				if (!receivedData) {
					container.logger.error(`[yt-dlp] Process ended without producing any audio data. stderr: ${stderrData.trim()}`);
				}
			});

			return { stream, type: StreamType.Arbitrary };
		}

		// SoundCloud and other sources: use play-dl
		return play.stream(url);
	}

	/**
	 * Get an audio stream starting from a specific position (seek).
	 * Uses yt-dlp to get the direct URL, then ffmpeg with -ss to seek.
	 * Only supported for YouTube-based sources.
	 */
	public async getStreamWithSeek(url: string, seekSeconds: number): Promise<{ stream: Readable; type: StreamType }> {
		if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
			throw new Error('Seeking is only supported for YouTube tracks.');
		}

		container.logger.debug(`[seek] Getting direct URL for: ${url}`);

		// Step 1: Get the direct audio URL from yt-dlp
		const info = (await youtubeDl(url, {
			getUrl: true,
			format: 'bestaudio',
			noWarnings: true,
			noCheckCertificates: true,
			...YT_DLP_BASE
		})) as unknown as string;

		const directUrl = String(info).trim();
		if (!directUrl) {
			throw new Error('Failed to get direct audio URL for seeking.');
		}

		container.logger.debug(`[seek] Seeking to ${seekSeconds}s via ffmpeg`);

		// Step 2: Spawn ffmpeg with -ss to seek, outputting raw PCM
		const proc = spawn(ffmpegPath, [
			'-ss', seekSeconds.toString(),
			'-i', directUrl,
			'-analyzeduration', '0',
			'-f', 's16le',
			'-ar', '48000',
			'-ac', '2',
			'-loglevel', 'error',
			'pipe:1'
		]);

		if (!proc.stdout) {
			throw new Error('Failed to start ffmpeg process for seeking.');
		}

		const stream = proc.stdout as Readable;

		const killProc = () => {
			if (!proc.killed) proc.kill();
		};
		stream.on('close', killProc);
		stream.on('end', killProc);

		stream.on('error', (err) => {
			container.logger.error(`[seek] ffmpeg stream error: ${err.message}`);
			killProc();
		});

		proc.on('error', (err) => {
			container.logger.error(`[seek] ffmpeg process error: ${err.message}`);
			killProc();
		});

		let stderrData = '';
		if (proc.stderr) {
			proc.stderr.on('data', (chunk: Buffer) => {
				stderrData += chunk.toString();
			});
		}

		proc.on('close', (code) => {
			if (code !== 0 && code !== null) {
				container.logger.error(`[seek] ffmpeg exited with code ${code}. stderr: ${stderrData.trim()}`);
			}
		});

		return { stream, type: StreamType.Raw };
	}

	/**
	 * Clean a YouTube URL by extracting the video ID and reconstructing a canonical URL.
	 * Handles URLs with extra params like ?reload=9&v=xxx
	 */
	private cleanYouTubeVideoUrl(input: string): string {
		const match = input.match(YOUTUBE_VIDEO_ID_REGEX);
		if (match) {
			return `https://www.youtube.com/watch?v=${match[1]}`;
		}
		return input;
	}

	private async resolveYouTube(input: string, requester: User): Promise<ResolveResult> {
		// Check for playlist first
		const playlistMatch = input.match(YOUTUBE_PLAYLIST_REGEX);
		if (playlistMatch) {
			return this.resolveYouTubePlaylist(playlistMatch[1], requester);
		}

		// Single video — use yt-dlp for metadata
		const cleanUrl = this.cleanYouTubeVideoUrl(input);
		const info = (await youtubeDl(cleanUrl, {
			dumpSingleJson: true,
			noWarnings: true,
			noCheckCertificates: true,
			skipDownload: true,
			...YT_DLP_BASE
		})) as { title?: string; id?: string; duration?: number; thumbnail?: string };

		const videoUrl = info.id ? `https://www.youtube.com/watch?v=${info.id}` : cleanUrl;
		const track: Track = {
			title: info.title ?? 'Unknown',
			url: videoUrl,
			duration: info.duration ?? 0,
			thumbnail: info.thumbnail ?? '',
			requester,
			source: AudioSource.YouTube
		};
		return { type: 'track', track };
	}

	private async resolveYouTubePlaylist(playlistId: string, requester: User): Promise<ResolveResult> {
		const cleanUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
		container.logger.debug(`[yt-dlp] Extracting playlist: ${cleanUrl}`);

		const info = (await youtubeDl(cleanUrl, {
			dumpSingleJson: true,
			noWarnings: true,
			noCheckCertificates: true,
			skipDownload: true,
			flatPlaylist: true,
			...YT_DLP_BASE
		})) as {
			title?: string;
			entries?: { id?: string; title?: string; duration?: number; thumbnail?: string; thumbnails?: { url: string }[] }[];
		};

		if (!info.entries || info.entries.length === 0) {
			throw new Error('Playlist is empty or could not be loaded.');
		}

		const tracks: Track[] = info.entries
			.filter((e) => e.id)
			.map((e) => ({
				title: e.title ?? 'Unknown',
				url: `https://www.youtube.com/watch?v=${e.id}`,
				duration: e.duration ?? 0,
				thumbnail: e.thumbnail ?? e.thumbnails?.[0]?.url ?? '',
				requester,
				source: AudioSource.YouTube
			}));

		if (tracks.length === 0) {
			throw new Error('No playable tracks found in playlist.');
		}

		container.logger.debug(`[yt-dlp] Extracted ${tracks.length} tracks from playlist "${info.title}"`);
		return { type: 'playlist', tracks, playlistTitle: info.title ?? 'YouTube Playlist' };
	}

	private async resolveSpotify(input: string, requester: User): Promise<ResolveResult> {
		const spType = play.sp_validate(input);

		if (spType === 'playlist' || spType === 'album') {
			throw new Error('Spotify playlists and albums are not supported. Please share individual track links or search by song name.');
		}

		// Fetch track metadata via Spotify's public oEmbed API (no credentials needed)
		const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(input)}`;
		const response = await fetch(oembedUrl);
		if (!response.ok) {
			throw new Error('Failed to fetch Spotify track info. Please try searching by song name instead.');
		}

		const data = (await response.json()) as { title: string; thumbnail_url?: string };
		const searchQuery = data.title; // Format: "Song Name - Artist Name"

		// Search YouTube for the track via yt-dlp and use the first result
		const results = await this.searchYouTube(searchQuery, 1);
		if (results.length === 0) {
			throw new Error(`No YouTube results found for: ${searchQuery}`);
		}

		const video = results[0];
		const track: Track = {
			title: data.title,
			url: `https://www.youtube.com/watch?v=${video.id}`,
			duration: video.duration,
			thumbnail: data.thumbnail_url ?? video.thumbnail,
			requester,
			source: AudioSource.Spotify
		};
		return { type: 'track', track };
	}

	private async resolveSoundCloud(input: string, requester: User): Promise<ResolveResult> {
		await this.ensureSoundCloud();
		const scType = await play.so_validate(input);

		if (scType === 'playlist') {
			const playlist = (await play.soundcloud(input)) as SoundCloudPlaylist;
			const allTracks = await playlist.all_tracks();
			const tracks: Track[] = allTracks.map((sc: SoundCloudTrack) => ({
				title: sc.name,
				url: sc.url,
				duration: Math.floor(sc.durationInMs / 1000),
				thumbnail: sc.thumbnail ?? '',
				requester,
				source: AudioSource.SoundCloud
			}));
			return { type: 'playlist', tracks, playlistTitle: playlist.name ?? 'SoundCloud Playlist' };
		}

		const sc = (await play.soundcloud(input)) as SoundCloudTrack;
		const track: Track = {
			title: sc.name,
			url: sc.url,
			duration: Math.floor(sc.durationInMs / 1000),
			thumbnail: sc.thumbnail ?? '',
			requester,
			source: AudioSource.SoundCloud
		};
		return { type: 'track', track };
	}

	/** Search SoundCloud via play-dl. Returns up to `limit` results. */
	public async searchSoundCloud(query: string, limit = 5): Promise<{ title: string; url: string; duration: number; thumbnail: string }[]> {
		await this.ensureSoundCloud();
		const results = await play.search(query, { source: { soundcloud: 'tracks' }, limit });

		return results.map((r) => {
			const sc = r as SoundCloudTrack;
			return {
				title: sc.name,
				url: sc.url,
				duration: Math.floor(sc.durationInMs / 1000),
				thumbnail: sc.thumbnail ?? ''
			};
		});
	}

	private async resolveSearch(input: string, requester: User): Promise<ResolveResult> {
		const results = await this.searchYouTube(input, 1);
		if (results.length === 0) throw new Error(`No results found for: ${input}`);

		const video = results[0];
		const track: Track = {
			title: video.title,
			url: `https://www.youtube.com/watch?v=${video.id}`,
			duration: video.duration,
			thumbnail: video.thumbnail,
			requester,
			source: AudioSource.Search
		};
		return { type: 'track', track };
	}
}
