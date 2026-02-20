import {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
	VoiceConnectionStatus,
	entersState,
	NoSubscriberBehavior,
	type AudioPlayer,
	type VoiceConnection,
	type AudioResource
} from '@discordjs/voice';
import type { VoiceBasedChannel, TextChannel, Snowflake } from 'discord.js';
import { container } from '@sapphire/framework';
import { Queue } from './Queue';
import type { Track } from './types';
import { AudioSourceResolver } from './AudioSourceResolver';
import { createNowPlayingEmbed } from './utils';

export class GuildMusicManager {
	public readonly guildId: Snowflake;
	public readonly queue: Queue;
	public readonly resolver: AudioSourceResolver;

	private _player: AudioPlayer | null = null;
	private _connection: VoiceConnection | null = null;
	private _volume = 70;
	private _currentResource: AudioResource | null = null;
	private _boundTextChannelId: Snowflake | null = null;
	private _boundVoiceChannelId: Snowflake | null = null;
	private _djRoleId: Snowflake | null = null;
	private _playStartedAt = 0;
	private _idleTimeout: ReturnType<typeof setTimeout> | null = null;

	private static readonly IDLE_TIMEOUT_MS = 10 * 1000;

	public constructor(guildId: Snowflake) {
		this.guildId = guildId;
		this.queue = new Queue();
		this.resolver = new AudioSourceResolver();
	}

	public get player(): AudioPlayer | null {
		return this._player;
	}

	public get connection(): VoiceConnection | null {
		return this._connection;
	}

	public get volume(): number {
		return this._volume;
	}

	public get boundTextChannelId(): Snowflake | null {
		return this._boundTextChannelId;
	}

	public set boundTextChannelId(id: Snowflake | null) {
		this._boundTextChannelId = id;
	}

	public get boundVoiceChannelId(): Snowflake | null {
		return this._boundVoiceChannelId;
	}

	public set boundVoiceChannelId(id: Snowflake | null) {
		this._boundVoiceChannelId = id;
	}

	public get djRoleId(): Snowflake | null {
		return this._djRoleId;
	}

	public set djRoleId(id: Snowflake | null) {
		this._djRoleId = id;
	}

	public get currentResource(): AudioResource | null {
		return this._currentResource;
	}

	public get playStartedAt(): number {
		return this._playStartedAt;
	}

	public get isPlaying(): boolean {
		return this._player?.state.status === AudioPlayerStatus.Playing;
	}

	public get isPaused(): boolean {
		return this._player?.state.status === AudioPlayerStatus.Paused;
	}

	public async connect(channel: VoiceBasedChannel): Promise<void> {
		this._connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,
			selfDeaf: true
		});

		if (!this._player) {
			this._player = createAudioPlayer({
				behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
			});
			this.setupPlayerListeners();
		}

		this._connection.subscribe(this._player);

		this._connection.on(VoiceConnectionStatus.Disconnected, async () => {
			try {
				await Promise.race([
					entersState(this._connection!, VoiceConnectionStatus.Signalling, 5_000),
					entersState(this._connection!, VoiceConnectionStatus.Connecting, 5_000)
				]);
			} catch {
				this.destroy();
			}
		});

		this._connection.on(VoiceConnectionStatus.Destroyed, () => {
			this.cleanup();
		});

		try {
			await entersState(this._connection, VoiceConnectionStatus.Ready, 30_000);
		} catch {
			this.destroy();
			throw new Error('Failed to connect to voice channel within 30 seconds.');
		}
	}

	public async playNext(specificTrack?: Track): Promise<Track | null> {
		const track = specificTrack ?? this.queue.dequeue();
		if (!track) {
			this.startIdleTimer();
			container.musicManagers.updatePresence();
			return null;
		}

		this.clearIdleTimer();

		try {
			const streamInfo = await this.resolver.getStream(track.url);

			this._currentResource = createAudioResource(streamInfo.stream, {
				inputType: streamInfo.type,
				inlineVolume: true
			});

			this._currentResource.volume?.setVolume(this._volume / 100);

			this._player!.play(this._currentResource);
			this._playStartedAt = Date.now();

			if (specificTrack) {
				this.queue.setCurrent(track);
			}

			container.musicManagers.recordTrackPlayed(track.duration);
			await this.sendNowPlaying(track);
			container.musicManagers.updatePresence();
			return track;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			container.logger.error(`Failed to play track "${track.title}": ${errorMsg}`);
			await this.sendTextMessage(`Failed to play **${track.title}**: ${errorMsg}`);
			return this.playNext();
		}
	}

	public pause(): boolean {
		if (this._player?.state.status === AudioPlayerStatus.Playing) {
			return this._player.pause(true);
		}
		return false;
	}

	public resume(): boolean {
		if (this._player?.state.status === AudioPlayerStatus.Paused) {
			return this._player.unpause();
		}
		return false;
	}

	public skip(): void {
		this._player?.stop();
	}

	public stop(): void {
		this.queue.clear();
		this._player?.stop(true);

		try {
			this._connection?.destroy();
		} catch {
			// Connection may already be destroyed
		}

		this.cleanup();
		container.musicManagers.delete(this.guildId);
	}

	public async seek(seconds: number): Promise<boolean> {
		const currentTrack = this.queue.current;
		if (!currentTrack || !this._player) return false;

		try {
			const streamInfo = await this.resolver.getStreamWithSeek(currentTrack.url, seconds);

			this._currentResource = createAudioResource(streamInfo.stream, {
				inputType: streamInfo.type,
				inlineVolume: true
			});

			this._currentResource.volume?.setVolume(this._volume / 100);
			this._player.play(this._currentResource);

			// Adjust playStartedAt so elapsed time calculations reflect the seek position
			this._playStartedAt = Date.now() - seconds * 1000;
			return true;
		} catch (error) {
			container.logger.error('Seek error:', error);
			return false;
		}
	}

	public setVolume(vol: number): void {
		this._volume = Math.max(0, Math.min(150, vol));
		if (this._currentResource?.volume) {
			this._currentResource.volume.setVolume(this._volume / 100);
		}
	}

	public destroy(): void {
		this.queue.clear();
		this._player?.stop(true);

		try {
			this._connection?.destroy();
		} catch {
			// Connection may already be destroyed
		}

		this.cleanup();
	}

	private setupPlayerListeners(): void {
		this._player!.on(AudioPlayerStatus.Idle, () => {
			this.playNext().catch((err) => {
				container.logger.error('Error advancing queue:', err);
			});
		});

		this._player!.on('error', (error) => {
			container.logger.error('AudioPlayer error:', error);
			this.sendTextMessage(`Playback error: ${error.message}. Skipping...`)
				.then(() => this.playNext())
				.catch((err) => container.logger.error('Error recovering from playback error:', err));
		});
	}

	private cleanup(): void {
		this.clearIdleTimer();
		this._player = null;
		this._connection = null;
		this._currentResource = null;
		this._playStartedAt = 0;
		container.musicManagers.updatePresence();
	}

	private startIdleTimer(): void {
		this.clearIdleTimer();
		this._idleTimeout = setTimeout(() => {
			this.sendTextMessage('No tracks in queue. Disconnecting due to inactivity.').catch(() => {});
			this.destroy();
			container.musicManagers.delete(this.guildId);
		}, GuildMusicManager.IDLE_TIMEOUT_MS);
	}

	private clearIdleTimer(): void {
		if (this._idleTimeout) {
			clearTimeout(this._idleTimeout);
			this._idleTimeout = null;
		}
	}

	private async sendNowPlaying(track: Track): Promise<void> {
		if (!this._boundTextChannelId) return;
		try {
			const channel = (await container.client.channels.fetch(this._boundTextChannelId)) as TextChannel | null;
			if (!channel) return;
			const embed = createNowPlayingEmbed(track, this._volume, this.queue.loopMode);
			await channel.send({ embeds: [embed] });
		} catch (error) {
			container.logger.warn('Failed to send now-playing embed:', error);
		}
	}

	private async sendTextMessage(message: string): Promise<void> {
		if (!this._boundTextChannelId) return;
		try {
			const channel = (await container.client.channels.fetch(this._boundTextChannelId)) as TextChannel | null;
			if (!channel) return;
			await channel.send({ content: message });
		} catch {
			// Silently ignore; text channel might be deleted
		}
	}
}
