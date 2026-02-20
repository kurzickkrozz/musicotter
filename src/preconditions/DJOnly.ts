import { Precondition } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';

export class DJOnlyPrecondition extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guild) {
			return this.error({ message: 'This command can only be used in a server.' });
		}

		const member = await interaction.guild.members.fetch(interaction.user.id);

		if (member.permissions.has(PermissionFlagsBits.Administrator)) {
			return this.ok();
		}

		if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return this.ok();
		}

		const manager = this.container.musicManagers.get(interaction.guild.id);
		if (!manager?.djRoleId) {
			return this.ok();
		}

		if (member.roles.cache.has(manager.djRoleId)) {
			return this.ok();
		}

		return this.error({ message: 'You need the DJ role or Manage Server permission to use this command.' });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		DJOnly: never;
	}
}
