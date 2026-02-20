import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Shuffle the queue',
	preconditions: ['InVoiceChannel']
})
export class ShuffleCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('shuffle').setDescription('Shuffle the queue'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager || manager.queue.size === 0) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Not enough tracks in the queue to shuffle.', ephemeral: true });
		}

		manager.queue.shuffle();
		return interaction.reply(`Shuffled **${manager.queue.size}** tracks in the queue.`);
	}
}
