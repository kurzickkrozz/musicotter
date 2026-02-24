import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { autoDelete, createHistoryEmbed } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Show recently played tracks',
	preconditions: ['Blacklisted', 'BoundTextChannel']
})
export class HistoryCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('history')
				.setDescription('Show recently played tracks')
				.addIntegerOption((option) => option.setName('page').setDescription('Page number').setRequired(false).setMinValue(1))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);
		const page = interaction.options.getInteger('page') ?? 1;

		if (!manager || manager.history.length === 0) {
			autoDelete(interaction);
			return interaction.reply({ content: 'No tracks have been played yet.', ephemeral: true });
		}

		const embed = createHistoryEmbed(manager.history, page);

		const totalPages = Math.max(1, Math.ceil(manager.history.length / 10));

		if (totalPages > 1) {
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`history_prev:${page}`)
					.setLabel('Previous')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(page <= 1),
				new ButtonBuilder()
					.setCustomId(`history_next:${page}`)
					.setLabel('Next')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(page >= totalPages)
			);
			autoDelete(interaction);
			return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
		}

		autoDelete(interaction);
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
