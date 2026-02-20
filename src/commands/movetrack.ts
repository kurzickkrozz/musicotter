import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
	description: 'Move a track from one queue position to another',
	preconditions: ['InVoiceChannel', 'DJOnly']
})
export class MoveTrackCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('movetrack')
				.setDescription('Move a track from one queue position to another')
				.addIntegerOption((option) => option.setName('from').setDescription('Current position of the track').setRequired(true).setMinValue(1))
				.addIntegerOption((option) => option.setName('to').setDescription('New position for the track').setRequired(true).setMinValue(1))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const from = interaction.options.getInteger('from', true);
		const to = interaction.options.getInteger('to', true);
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager || manager.queue.size === 0) {
			return interaction.reply({ content: 'The queue is empty.', ephemeral: true });
		}

		if (from === to) {
			return interaction.reply({ content: 'The positions are the same.', ephemeral: true });
		}

		if (from > manager.queue.size || to > manager.queue.size) {
			return interaction.reply({ content: `Invalid position. The queue has **${manager.queue.size}** track${manager.queue.size === 1 ? '' : 's'}.`, ephemeral: true });
		}

		const track = manager.queue.move(from, to);

		if (!track) {
			return interaction.reply({ content: 'Failed to move track. Check the positions and try again.', ephemeral: true });
		}

		return interaction.reply(`Moved **${track.title}** from position **#${from}** to **#${to}**.`);
	}
}
