import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { SORTED_STATIONS } from '../lib/stations';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class StationSelectionHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('station_')) return this.none();
		return this.some();
	}

	public override async run(interaction: ButtonInteraction) {
		const parts = interaction.customId.split(':');
		const action = parts[0];
		const userId = parts[parts.length - 1];

		if (interaction.user.id !== userId) {
			return interaction.reply({ content: 'This is not your station list.', ephemeral: true });
		}

		if (action === 'station_cancel') {
			return interaction.update({ content: 'Station selection cancelled.', embeds: [], components: [] });
		}

		const stationIndex = parseInt(parts[1], 10);
		const station = SORTED_STATIONS[stationIndex];

		if (!station) {
			return interaction.update({ content: 'Invalid station selection.', embeds: [], components: [] });
		}

		await interaction.update({ content: `Loading **${station.name}**...`, embeds: [], components: [] });

		try {
			const manager = this.container.musicManagers.getOrCreate(interaction.guildId!);
			const member = await interaction.guild!.members.fetch(interaction.user.id);
			const voiceChannel = member.voice.channel;

			if (!voiceChannel) {
				return interaction.editReply('You must be in a voice channel.');
			}

			if (!manager.boundTextChannelId) {
				manager.boundTextChannelId = interaction.channelId;
			}

			if (!manager.connection) {
				await manager.connect(voiceChannel);
			}

			const result = await manager.resolver.resolve(station.url, interaction.user);

			if (result.type === 'playlist') {
				const wasEmpty = !manager.queue.current;
				manager.queue.enqueue(result.tracks);

				if (wasEmpty) {
					await manager.playNext();
				}

				return interaction.editReply(
					`\u{1F4FB} Now playing station **${station.name}** \u2014 added **${result.tracks.length}** tracks to the queue.`
				);
			}

			// Single track fallback (shouldn't happen with playlists, but just in case)
			if (!manager.queue.current) {
				manager.queue.enqueue(result.track);
				await manager.playNext();
				return interaction.editReply(`Now playing: **${result.track.title}**`);
			}

			manager.queue.enqueue(result.track);
			return interaction.editReply(`Added to queue: **${result.track.title}**`);
		} catch (error) {
			this.container.logger.error('Station selection error:', error);
			return interaction.editReply(`Failed to load station: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
