import { Precondition } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';

export class InVoiceChannelPrecondition extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guild) {
			return this.error({ message: 'This command can only be used in a server.' });
		}

		const member = await interaction.guild.members.fetch(interaction.user.id);

		if (!member.voice.channel) {
			return this.error({ message: 'You must be in a voice channel to use this command.' });
		}

		// If a bound voice channel is set, enforce it
		const manager = this.container.musicManagers.get(interaction.guildId!);
		if (manager?.boundVoiceChannelId && member.voice.channel.id !== manager.boundVoiceChannelId) {
			return this.error({ message: `The bot is restricted to <#${manager.boundVoiceChannelId}>. Please join that channel.` });
		}

		return this.ok();
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		InVoiceChannel: never;
	}
}
