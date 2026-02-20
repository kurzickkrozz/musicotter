import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ButtonInteraction } from 'discord.js';
import { createQueueEmbed } from '../lib/utils';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class QueuePaginationHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('queue_')) return this.none();
		return this.some();
	}

	public override async run(interaction: ButtonInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager) {
			return interaction.update({ content: 'The queue is empty.', embeds: [], components: [] });
		}

		const [action, pageStr] = interaction.customId.split(':');
		const currentPage = parseInt(pageStr, 10);

		const newPage = action === 'queue_next' ? currentPage + 1 : currentPage - 1;
		const totalPages = Math.max(1, Math.ceil(manager.queue.size / 10));
		const safePage = Math.max(1, Math.min(newPage, totalPages));

		const embed = createQueueEmbed(manager.queue.current, manager.queue.tracks, safePage, manager.queue.loopMode, manager.volume);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`queue_prev:${safePage}`)
				.setLabel('Previous')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(safePage <= 1),
			new ButtonBuilder()
				.setCustomId(`queue_next:${safePage}`)
				.setLabel('Next')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(safePage >= totalPages)
		);

		return interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
	}
}
