import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { EMBED_COLOR } from '../lib/constants';
import { autoDelete, formatDuration } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Search YouTube and choose a result to play',
	preconditions: ['Blacklisted', 'BoundTextChannel', 'InVoiceChannel']
})
export class SearchCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('search')
				.setDescription('Search YouTube and choose a result to play')
				.addStringOption((option) => option.setName('query').setDescription('What to search for').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const query = interaction.options.getString('query', true);

		await interaction.deferReply({ ephemeral: true });

		try {
			const resolver = this.container.musicManagers.getOrCreate(interaction.guildId!).resolver;
			const results = await resolver.searchYouTube(query, 5);

			if (results.length === 0) {
				autoDelete(interaction);
				return interaction.editReply('No results found.');
			}

			const embed = new EmbedBuilder()
				.setColor(EMBED_COLOR)
				.setTitle(`Search results for: "${query}"`)
				.setDescription(
					results
						.map(
							(video, i) =>
								`**${i + 1}.** [${video.title}](https://www.youtube.com/watch?v=${video.id}) \u2014 \`${formatDuration(video.duration)}\``
						)
						.join('\n')
				)
				.setFooter({ text: 'Select a track to play by clicking a button below.' });

			const selectRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				...results.map((_, i) =>
					new ButtonBuilder()
						.setCustomId(`search_select:${i}:${interaction.user.id}`)
						.setLabel(`${i + 1}`)
						.setStyle(ButtonStyle.Primary)
				)
			);

			const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId(`search_cancel:${interaction.user.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
			);

			autoDelete(interaction);
			return interaction.editReply({ embeds: [embed], components: [selectRow, cancelRow] });
		} catch (error) {
			this.container.logger.error('Search command error:', error);
			autoDelete(interaction);
			return interaction.editReply(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
