import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Stop playback and clear the queue',
	preconditions: ['BoundTextChannel', 'InVoiceChannel', 'DJOnly']
})
export class StopCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('stop').setDescription('Stop playback and clear the queue'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager?.queue.current) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
		}

		manager.stop();
		return interaction.reply('Stopped playback and cleared the queue.');
	}
}
