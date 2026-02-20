import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
	description: 'Play a song or add it to the queue',
	preconditions: ['InVoiceChannel']
})
export class PlayCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('play')
				.setDescription('Play a song or add it to the queue')
				.addStringOption((option) => option.setName('query').setDescription('Song name, YouTube/Spotify/SoundCloud URL').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const query = interaction.options.getString('query', true);
		const member = await interaction.guild!.members.fetch(interaction.user.id);
		const voiceChannel = member.voice.channel!;

		await interaction.deferReply();

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
					return interaction.editReply(`Now playing: **${result.track.title}**`);
				}

				manager.queue.enqueue(result.track);
				return interaction.editReply(`Added to queue: **${result.track.title}** (Position #${manager.queue.size})`);
			}

			const wasEmpty = !manager.queue.current;
			manager.queue.enqueue(result.tracks);

			if (wasEmpty) {
				await manager.playNext();
			}

			return interaction.editReply(`Added **${result.tracks.length}** tracks from **${result.playlistTitle}** to the queue.`);
		} catch (error) {
			this.container.logger.error('Play command error:', error);
			return interaction.editReply(`Failed to play: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
