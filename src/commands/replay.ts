import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Replay the current track from the beginning',
	preconditions: ['Blacklisted', 'BoundTextChannel', 'InVoiceChannel']
})
export class ReplayCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('replay').setDescription('Replay the current track from the beginning'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager?.queue.current) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
		}

		const track = manager.queue.current;
		await manager.playNext(track);

		autoDelete(interaction);
		return interaction.reply({ content: `Replaying: **${track.title}**`, ephemeral: true });
	}
}
