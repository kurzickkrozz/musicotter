import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { autoDelete, createQueueEmbed } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Show the current queue'
})
export class QueueCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('queue')
				.setDescription('Show the current queue')
				.addIntegerOption((option) => option.setName('page').setDescription('Page number').setRequired(false).setMinValue(1))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);
		const page = interaction.options.getInteger('page') ?? 1;

		if (!manager || (!manager.queue.current && manager.queue.size === 0)) {
			autoDelete(interaction);
			return interaction.reply({ content: 'The queue is empty.', ephemeral: true });
		}

		const embed = createQueueEmbed(manager.queue.current, manager.queue.tracks, page, manager.queue.loopMode, manager.volume);

		const totalPages = Math.max(1, Math.ceil(manager.queue.size / 10));

		if (totalPages > 1) {
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`queue_prev:${page}`)
					.setLabel('Previous')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(page <= 1),
				new ButtonBuilder()
					.setCustomId(`queue_next:${page}`)
					.setLabel('Next')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(page >= totalPages)
			);
			return interaction.reply({ embeds: [embed], components: [row] });
		}

		return interaction.reply({ embeds: [embed] });
	}
}
