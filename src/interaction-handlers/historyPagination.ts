import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ButtonInteraction } from 'discord.js';
import { createHistoryEmbed } from '../lib/utils';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class HistoryPaginationHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('history_')) return this.none();
		return this.some();
	}

	public override async run(interaction: ButtonInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager || manager.history.length === 0) {
			return interaction.update({ content: 'No tracks have been played yet.', embeds: [], components: [] });
		}

		const [action, pageStr] = interaction.customId.split(':');
		const currentPage = parseInt(pageStr, 10);

		const newPage = action === 'history_next' ? currentPage + 1 : currentPage - 1;
		const totalPages = Math.max(1, Math.ceil(manager.history.length / 10));
		const safePage = Math.max(1, Math.min(newPage, totalPages));

		const embed = createHistoryEmbed(manager.history, safePage);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`history_prev:${safePage}`)
				.setLabel('Previous')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(safePage <= 1),
			new ButtonBuilder()
				.setCustomId(`history_next:${safePage}`)
				.setLabel('Next')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(safePage >= totalPages)
		);

		return interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
	}
}
