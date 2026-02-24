import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Remove all tracks by a specific user from the queue',
	preconditions: ['Blacklisted', 'BoundTextChannel', 'InVoiceChannel', 'DJOnly']
})
export class ForceRemoveCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('forceremove')
				.setDescription('Remove all tracks by a specific user from the queue')
				.addUserOption((option) => option.setName('user').setDescription('User whose tracks to remove').setRequired(true))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);
		const targetUser = interaction.options.getUser('user', true);

		if (!manager || manager.queue.size === 0) {
			autoDelete(interaction);
			return interaction.reply({ content: 'The queue is empty.', ephemeral: true });
		}

		const removed = manager.queue.removeByUser(targetUser.id);

		if (removed === 0) {
			autoDelete(interaction);
			return interaction.reply({ content: `No tracks by **${targetUser.username}** found in the queue.`, ephemeral: true });
		}

		autoDelete(interaction);
		return interaction.reply({ content: `Removed **${removed}** track${removed === 1 ? '' : 's'} by **${targetUser.username}** from the queue.`, ephemeral: true });
	}
}
