import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Pause the current track',
	preconditions: ['Blacklisted', 'BoundTextChannel', 'InVoiceChannel']
})
export class PauseCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('pause').setDescription('Pause the current track'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager?.queue.current) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
		}

		if (manager.isPaused) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Playback is already paused.', ephemeral: true });
		}

		const success = manager.pause();
		if (success) {
			autoDelete(interaction);
			return interaction.reply({ content: `Paused: **${manager.queue.current.title}**`, ephemeral: true });
		}

		autoDelete(interaction);
		return interaction.reply({ content: 'Failed to pause playback.', ephemeral: true });
	}
}
