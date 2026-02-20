import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class SearchSelectionHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('search_')) return this.none();
		return this.some();
	}

	public override async run(interaction: ButtonInteraction) {
		const parts = interaction.customId.split(':');
		const action = parts[0];
		const userId = parts[parts.length - 1];

		// Only the user who ran /search can interact
		if (interaction.user.id !== userId) {
			return interaction.reply({ content: 'This is not your search.', ephemeral: true });
		}

		// Cancel button
		if (action === 'search_cancel') {
			return interaction.update({ content: 'Search cancelled.', embeds: [], components: [] });
		}

		const resultIndex = parseInt(parts[1], 10);

		// Extract the original query from the embed title
		const embed = interaction.message.embeds[0];
		const titleMatch = embed?.title?.match(/Search results for: "(.+)"/);
		const query = titleMatch?.[1];

		if (!query) {
			return interaction.update({ content: 'Could not determine search query. Please try again.', embeds: [], components: [] });
		}

		await interaction.update({ content: 'Loading...', embeds: [], components: [] });

		try {
			const manager = this.container.musicManagers.getOrCreate(interaction.guildId!);

			// Re-fetch search results via yt-dlp
			const results = await manager.resolver.searchYouTube(query, 5);
			const video = results[resultIndex];

			if (!video) {
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

			const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
			const result = await manager.resolver.resolve(videoUrl, interaction.user);

			if (result.type !== 'track') {
				return interaction.editReply('Unexpected result type.');
			}

			if (!manager.queue.current) {
				manager.queue.enqueue(result.track);
				await manager.playNext();
				return interaction.editReply(`Now playing: **${result.track.title}**`);
			}

			manager.queue.enqueue(result.track);
			return interaction.editReply(`Added to queue: **${result.track.title}** (Position #${manager.queue.size})`);
		} catch (error) {
			this.container.logger.error('Search selection error:', error);
			return interaction.editReply(`Failed to play: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
