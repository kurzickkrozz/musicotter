import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { AudioSource, type Track } from '../lib/types';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class SCSearchSelectionHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('scsearch_')) return this.none();
		return this.some();
	}

	public override async run(interaction: ButtonInteraction) {
		const parts = interaction.customId.split(':');
		const action = parts[0];
		const userId = parts[parts.length - 1];

		if (interaction.user.id !== userId) {
			return interaction.reply({ content: 'This is not your search.', ephemeral: true });
		}

		if (action === 'scsearch_cancel') {
			return interaction.update({ content: 'Search cancelled.', embeds: [], components: [] });
		}

		const resultIndex = parseInt(parts[1], 10);

		// Extract the original query from the embed title
		const embed = interaction.message.embeds[0];
		const titleMatch = embed?.title?.match(/SoundCloud results for: "(.+)"/);
		const query = titleMatch?.[1];

		if (!query) {
			return interaction.update({ content: 'Could not determine search query. Please try again.', embeds: [], components: [] });
		}

		await interaction.update({ content: 'Loading...', embeds: [], components: [] });

		try {
			const manager = this.container.musicManagers.getOrCreate(interaction.guildId!);

			// Re-fetch search results
			const results = await manager.resolver.searchSoundCloud(query, 5);
			const selected = results[resultIndex];

			if (!selected) {
				return interaction.editReply('That result is no longer available.');
			}

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

			const track: Track = {
				title: selected.title,
				url: selected.url,
				duration: selected.duration,
				thumbnail: selected.thumbnail,
				requester: interaction.user,
				source: AudioSource.SoundCloud
			};

			if (!manager.queue.current) {
				manager.queue.enqueue(track);
				await manager.playNext();
				return interaction.editReply(`Now playing: **${track.title}**`);
			}

			manager.queue.enqueue(track);
			return interaction.editReply(`Added to queue: **${track.title}** (Position #${manager.queue.size})`);
		} catch (error) {
			this.container.logger.error('SoundCloud search selection error:', error);
			return interaction.editReply(`Failed to play: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
