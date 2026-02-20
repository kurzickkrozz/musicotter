import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { EMBED_COLOR } from '../lib/constants';
import { autoDelete, formatDuration } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Search SoundCloud and choose a result to play',
	preconditions: ['BoundTextChannel', 'InVoiceChannel']
})
export class SCSearchCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('scsearch')
				.setDescription('Search SoundCloud and choose a result to play')
				.addStringOption((option) => option.setName('query').setDescription('What to search for').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const query = interaction.options.getString('query', true);

		await interaction.deferReply({ ephemeral: true });

		try {
			const resolver = this.container.musicManagers.getOrCreate(interaction.guildId!).resolver;
			const results = await resolver.searchSoundCloud(query, 5);

			if (results.length === 0) {
				autoDelete(interaction);
				return interaction.editReply('No SoundCloud results found.');
			}

			const embed = new EmbedBuilder()
				.setColor(EMBED_COLOR)
				.setTitle(`\u{1F7E0} SoundCloud results for: "${query}"`)
				.setDescription(
					results
						.map(
							(track, i) =>
								`**${i + 1}.** [${track.title}](${track.url}) \u2014 \`${formatDuration(track.duration)}\``
						)
						.join('\n')
				)
				.setFooter({ text: 'Select a track to play by clicking a button below.' });

			const selectRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				...results.map((_, i) =>
					new ButtonBuilder()
						.setCustomId(`scsearch_select:${i}:${interaction.user.id}`)
						.setLabel(`${i + 1}`)
						.setStyle(ButtonStyle.Primary)
				)
			);

			const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId(`scsearch_cancel:${interaction.user.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
			);

			autoDelete(interaction);
			return interaction.editReply({ embeds: [embed], components: [selectRow, cancelRow] });
		} catch (error) {
			this.container.logger.error('SoundCloud search error:', error);
			autoDelete(interaction);
			return interaction.editReply(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
