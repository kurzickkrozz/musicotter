import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Add a song to the front of the queue',
	preconditions: ['Blacklisted', 'BoundTextChannel', 'InVoiceChannel']
})
export class PlayNextCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('playnext')
				.setDescription('Add a song to the front of the queue')
				.addStringOption((option) => option.setName('query').setDescription('Song name, YouTube/Spotify/SoundCloud URL').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const query = interaction.options.getString('query', true);
		const member = await interaction.guild!.members.fetch(interaction.user.id);
		const voiceChannel = member.voice.channel!;

		await interaction.deferReply({ ephemeral: true });

		const manager = this.container.musicManagers.getOrCreate(interaction.guildId!);

		if (!manager.boundTextChannelId) {
			manager.boundTextChannelId = interaction.channelId;
		}

		try {
			if (!manager.connection) {
				await manager.connect(voiceChannel);
			}

			const result = await manager.resolver.resolve(query, interaction.user);

			if (result.type === 'track') {
				if (!manager.queue.current) {
					manager.queue.enqueue(result.track);
					await manager.playNext();
					autoDelete(interaction);
					return interaction.editReply(`Now playing: **${result.track.title}**`);
				}

				manager.queue.enqueueNext(result.track);
				autoDelete(interaction);
				return interaction.editReply(`Added to front of queue: **${result.track.title}**`);
			}

			const wasEmpty = !manager.queue.current;

			// For playlists, add in reverse order so the first track ends up at position 0
			for (let i = result.tracks.length - 1; i >= 0; i--) {
				manager.queue.enqueueNext(result.tracks[i]);
			}

			if (wasEmpty) {
				await manager.playNext();
			}

			autoDelete(interaction);
			return interaction.editReply(`Added **${result.tracks.length}** tracks from **${result.playlistTitle}** to the front of the queue.`);
		} catch (error) {
			this.container.logger.error('PlayNext command error:', error);
			autoDelete(interaction);
			return interaction.editReply(`Failed to play: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
