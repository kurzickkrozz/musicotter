import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { EMBED_COLOR } from '../lib/constants';
import { SORTED_STATIONS } from '../lib/stations';

@ApplyOptions<Command.Options>({
	description: 'Browse pre-configured radio stations (playlists)',
	preconditions: ['InVoiceChannel']
})
export class RadioStationsCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('radiostations').setDescription('Browse pre-configured radio stations (playlists)'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (SORTED_STATIONS.length === 0) {
			return interaction.reply({ content: 'No radio stations have been configured yet.', ephemeral: true });
		}

		const stationList = SORTED_STATIONS.map((s, i) => `**${i + 1}** \u2014 ${s.name}`).join('\n');

		const embed = new EmbedBuilder()
			.setColor(EMBED_COLOR)
			.setTitle('\u{1F4FB} Radio Stations')
			.setDescription(stationList)
			.setFooter({ text: 'Select a station by clicking a button below.' });

		// Build button rows (max 5 buttons per row)
		const rows: ActionRowBuilder<ButtonBuilder>[] = [];
		for (let i = 0; i < SORTED_STATIONS.length; i += 5) {
			const chunk = SORTED_STATIONS.slice(i, i + 5);
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				...chunk.map((_, j) =>
					new ButtonBuilder()
						.setCustomId(`station_select:${i + j}:${interaction.user.id}`)
						.setLabel(`${i + j + 1}`)
						.setStyle(ButtonStyle.Primary)
				)
			);
			rows.push(row);
		}

		// Add cancel button in its own row (if we have room — Discord allows max 5 rows)
		if (rows.length < 5) {
			rows.push(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setCustomId(`station_cancel:${interaction.user.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
				)
			);
		}

		return interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
	}
}
