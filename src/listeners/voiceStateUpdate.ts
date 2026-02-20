import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { VoiceState } from 'discord.js';

const emptyChannelTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const EMPTY_CHANNEL_TIMEOUT_MS = 30_000;

@ApplyOptions<Listener.Options>({ event: 'voiceStateUpdate' })
export class VoiceStateUpdateListener extends Listener {
	public override run(oldState: VoiceState, _newState: VoiceState) {
		const guildId = oldState.guild.id;
		const manager = this.container.musicManagers.get(guildId);
		if (!manager?.connection) return;

		const botVoiceChannelId = oldState.guild.members.me?.voice.channelId;
		if (!botVoiceChannelId) return;

		// Someone left the bot's voice channel
		if (oldState.channelId === botVoiceChannelId) {
			const channel = oldState.guild.channels.cache.get(botVoiceChannelId);
			if (!channel || !channel.isVoiceBased()) return;

			const humanMembers = channel.members.filter((m) => !m.user.bot).size;

			if (humanMembers === 0 && !emptyChannelTimeouts.has(guildId)) {
				const timeout = setTimeout(() => {
					emptyChannelTimeouts.delete(guildId);
					if (this.container.musicManagers.has(guildId)) {
						this.container.logger.info(`Auto-disconnecting from empty voice channel in guild ${guildId}`);
						this.container.musicManagers.delete(guildId);
					}
				}, EMPTY_CHANNEL_TIMEOUT_MS);

				emptyChannelTimeouts.set(guildId, timeout);
			}
		}

		// Someone joined the bot's voice channel -- cancel timeout
		if (_newState.channelId === botVoiceChannelId) {
			const existing = emptyChannelTimeouts.get(guildId);
			if (existing) {
				clearTimeout(existing);
				emptyChannelTimeouts.delete(guildId);
			}
		}
	}
}
