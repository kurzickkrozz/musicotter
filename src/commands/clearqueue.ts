import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Clear all tracks from the queue',
	preconditions: ['InVoiceChannel', 'DJOnly']
})
export class ClearQueueCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('clearqueue').setDescription('Clear all tracks from the queue'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager || manager.queue.size === 0) {
			autoDelete(interaction);
			return interaction.reply({ content: 'The queue is already empty.', ephemeral: true });
		}

		const count = manager.queue.size;
		manager.queue.clearUpcoming();

		return interaction.reply(`Cleared **${count}** track${count === 1 ? '' : 's'} from the queue.`);
	}
}
