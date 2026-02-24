import { ActivityType, type Snowflake } from 'discord.js';
import { container } from '@sapphire/framework';
import { GuildMusicManager } from './GuildMusicManager';

export class MusicManagerStore {
	private readonly _managers = new Map<Snowflake, GuildMusicManager>();
	private readonly _blacklists = new Map<Snowflake, Set<Snowflake>>();
	private _totalTracksPlayed = 0;
	private _totalPlayTimeSeconds = 0;
	private readonly _uniqueUsers = new Set<string>();

	public getOrCreate(guildId: Snowflake): GuildMusicManager {
		let manager = this._managers.get(guildId);
		if (!manager) {
			manager = new GuildMusicManager(guildId);
			this._managers.set(guildId, manager);
		}
		return manager;
	}

	public get(guildId: Snowflake): GuildMusicManager | undefined {
		return this._managers.get(guildId);
	}

	public has(guildId: Snowflake): boolean {
		return this._managers.has(guildId);
	}

	public delete(guildId: Snowflake): boolean {
		const manager = this._managers.get(guildId);
		if (manager) {
			manager.destroy();
		}
		return this._managers.delete(guildId);
	}

	public destroyAll(): void {
		for (const manager of this._managers.values()) {
			manager.destroy();
		}
		this._managers.clear();
	}

	public get size(): number {
		return this._managers.size;
	}

	public get totalTracksPlayed(): number {
		return this._totalTracksPlayed;
	}

	public get totalPlayTimeSeconds(): number {
		return this._totalPlayTimeSeconds;
	}

	public recordTrackPlayed(durationSeconds: number): void {
		this._totalTracksPlayed++;
		this._totalPlayTimeSeconds += durationSeconds;
	}

	public recordUserInteraction(userId: string): void {
		this._uniqueUsers.add(userId);
	}

	public get totalUniqueUsers(): number {
		return this._uniqueUsers.size;
	}

	public isBlacklisted(guildId: Snowflake, userId: Snowflake): boolean {
		return this._blacklists.get(guildId)?.has(userId) ?? false;
	}

	public addToBlacklist(guildId: Snowflake, userId: Snowflake): boolean {
		let set = this._blacklists.get(guildId);
		if (!set) {
			set = new Set();
			this._blacklists.set(guildId, set);
		}
		if (set.has(userId)) return false;
		set.add(userId);
		return true;
	}

	public removeFromBlacklist(guildId: Snowflake, userId: Snowflake): boolean {
		const set = this._blacklists.get(guildId);
		if (!set) return false;
		return set.delete(userId);
	}

	public getBlacklist(guildId: Snowflake): ReadonlySet<Snowflake> {
		return this._blacklists.get(guildId) ?? new Set();
	}

	/** Update the bot's presence to reflect the currently playing track (if any). */
	public updatePresence(): void {
		const client = container.client;
		if (!client.user) return;

		// Find any manager that is actively playing and has a current track
		let activeTrackTitle: string | null = null;
		for (const manager of this._managers.values()) {
			if (manager.isPlaying && manager.queue.current) {
				activeTrackTitle = manager.queue.current.title;
				break;
			}
		}

		if (activeTrackTitle) {
			client.user.setActivity({
				name: 'custom',
				type: ActivityType.Custom,
				state: `\u{1F3B6}Now playing: ${activeTrackTitle}`
			});
		} else {
			client.user.setActivity({
				name: 'custom',
				type: ActivityType.Custom,
				state: 'Wading in the water'
			});
		}
	}
}
