import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Remove a track from the queue by position',
	preconditions: ['Blacklisted', 'BoundTextChannel', 'InVoiceChannel']
})
export class RemoveCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('remove')
				.setDescription('Remove a track from the queue by position')
				.addIntegerOption((option) => option.setName('position').setDescription('Queue position to remove').setRequired(true).setMinValue(1))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const position = interaction.options.getInteger('position', true);
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager || manager.queue.size === 0) {
			autoDelete(interaction);
			return interaction.reply({ content: 'The queue is empty.', ephemeral: true });
		}

		if (position > manager.queue.size) {
			autoDelete(interaction);
			return interaction.reply({
				content: `Invalid position. The queue has **${manager.queue.size}** track${manager.queue.size === 1 ? '' : 's'}.`,
				ephemeral: true
			});
		}

		const track = manager.queue.remove(position);

		if (!track) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Failed to remove track. Check the position and try again.', ephemeral: true });
		}

		autoDelete(interaction);
		return interaction.reply({ content: `Removed **${track.title}** from position **#${position}**.`, ephemeral: true });
	}
}
