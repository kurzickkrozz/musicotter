import type { User } from 'discord.js';

export enum AudioSource {
	YouTube = 'youtube',
	Spotify = 'spotify',
	SoundCloud = 'soundcloud',
	Search = 'search'
}

export enum LoopMode {
	Off = 'off',
	Track = 'track',
	Queue = 'queue'
}

export interface Track {
	readonly title: string;
	readonly url: string;
	readonly duration: number;
	readonly thumbnail: string;
	readonly requester: User;
	readonly source: AudioSource;
}

export type ResolveResult = { type: 'track'; track: Track } | { type: 'playlist'; tracks: Track[]; playlistTitle: string };
