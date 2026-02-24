import { Precondition } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';

export class BlacklistedPrecondition extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guild) return this.ok();

		const member = await interaction.guild.members.fetch(interaction.user.id);

		// Admins and Manage Server users bypass the blacklist
		if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return this.ok();
		}

		if (this.container.musicManagers.isBlacklisted(interaction.guild.id, interaction.user.id)) {
			return this.error({ message: 'You have been blacklisted from using bot commands in this server.' });
		}

		return this.ok();
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		Blacklisted: never;
	}
}
