import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Set or show the DJ role',
	preconditions: ['BoundTextChannel'],
	requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
})
export class SetDJCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('setdj')
				.setDescription('Set or show the DJ role for music command permissions')
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
				.addRoleOption((option) => option.setName('role').setDescription('Role to set as DJ (omit to show current)').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.getOrCreate(interaction.guildId!);
		const role = interaction.options.getRole('role');

		if (!role) {
			autoDelete(interaction);
			if (!manager.djRoleId) {
				return interaction.reply({
					content: 'No DJ role is set. All users can use DJ-restricted commands.',
					ephemeral: true
				});
			}

			return interaction.reply({ content: `Current DJ role: <@&${manager.djRoleId}>`, ephemeral: true });
		}

		manager.djRoleId = role.id;
		return interaction.reply(`DJ role set to: <@&${role.id}>`);
	}
}
