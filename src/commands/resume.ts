import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Resume the current track',
	preconditions: ['BoundTextChannel', 'InVoiceChannel']
})
export class ResumeCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('resume').setDescription('Resume the current track'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager?.queue.current) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
		}

		if (!manager.isPaused) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Playback is not paused.', ephemeral: true });
		}

		const success = manager.resume();
		if (success) {
			return interaction.reply(`Resumed: **${manager.queue.current.title}**`);
		}

		autoDelete(interaction);
		return interaction.reply({ content: 'Failed to resume playback.', ephemeral: true });
	}
}
