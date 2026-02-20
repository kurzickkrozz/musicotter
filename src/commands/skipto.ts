import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Skip to a specific position in the queue',
	preconditions: ['BoundTextChannel', 'InVoiceChannel', 'DJOnly']
})
export class SkipToCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('skipto')
				.setDescription('Skip to a specific position in the queue')
				.addIntegerOption((option) =>
					option.setName('position').setDescription('Position number in the queue to skip to').setRequired(true).setMinValue(1)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);
		const position = interaction.options.getInteger('position', true);

		if (!manager?.queue.current) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
		}

		if (position > manager.queue.size) {
			autoDelete(interaction);
			return interaction.reply({
				content: `Invalid position. The queue only has **${manager.queue.size}** track${manager.queue.size === 1 ? '' : 's'}.`,
				ephemeral: true
			});
		}

		const track = manager.queue.skipTo(position);
		if (!track) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Failed to skip to that position.', ephemeral: true });
		}

		// Stop current playback; the skipTo already called dequeue which set the new current
		// We need to play the new track
		await manager.playNext(track);
		return interaction.reply(`Skipped to position **#${position}**: **${track.title}**`);
	}
}
