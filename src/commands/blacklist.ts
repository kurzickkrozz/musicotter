import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { EMBED_COLOR } from '../lib/constants';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Manage the bot blacklist for this server',
	preconditions: ['BoundTextChannel', 'DJOnly']
})
export class BlacklistCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('blacklist')
				.setDescription('Manage the bot blacklist for this server')
				.addSubcommand((sub) =>
					sub
						.setName('add')
						.setDescription('Blacklist a user from using bot commands')
						.addUserOption((opt) => opt.setName('user').setDescription('The user to blacklist').setRequired(true))
				)
				.addSubcommand((sub) =>
					sub
						.setName('remove')
						.setDescription('Remove a user from the blacklist')
						.addUserOption((opt) => opt.setName('user').setDescription('The user to unblacklist').setRequired(true))
				)
				.addSubcommand((sub) => sub.setName('list').setDescription('Show all blacklisted users'))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand(true);
		const guildId = interaction.guildId!;

		switch (subcommand) {
			case 'add':
				return this.handleAdd(interaction, guildId);
			case 'remove':
				return this.handleRemove(interaction, guildId);
			default:
				return this.handleList(interaction, guildId);
		}
	}

	private async handleAdd(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const user = interaction.options.getUser('user', true);

		if (user.id === interaction.user.id) {
			autoDelete(interaction);
			return interaction.reply({ content: "You can't blacklist yourself.", ephemeral: true });
		}

		if (user.bot) {
			autoDelete(interaction);
			return interaction.reply({ content: "You can't blacklist a bot.", ephemeral: true });
		}

		const added = this.container.musicManagers.addToBlacklist(guildId, user.id);

		autoDelete(interaction);
		if (added) {
			return interaction.reply({ content: `**${user.displayName}** has been blacklisted from using bot commands.`, ephemeral: true });
		}
		return interaction.reply({ content: `**${user.displayName}** is already blacklisted.`, ephemeral: true });
	}

	private async handleRemove(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const user = interaction.options.getUser('user', true);

		const removed = this.container.musicManagers.removeFromBlacklist(guildId, user.id);

		autoDelete(interaction);
		if (removed) {
			return interaction.reply({ content: `**${user.displayName}** has been removed from the blacklist.`, ephemeral: true });
		}
		return interaction.reply({ content: `**${user.displayName}** is not blacklisted.`, ephemeral: true });
	}

	private async handleList(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const blacklist = this.container.musicManagers.getBlacklist(guildId);

		if (blacklist.size === 0) {
			autoDelete(interaction);
			return interaction.reply({ content: 'No users are blacklisted in this server.', ephemeral: true });
		}

		const userList = [...blacklist].map((id) => `<@${id}>`).join('\n');

		const embed = new EmbedBuilder()
			.setColor(EMBED_COLOR)
			.setTitle(`Blacklist - ${blacklist.size} user${blacklist.size === 1 ? '' : 's'}`)
			.setDescription(userList);

		autoDelete(interaction);
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
