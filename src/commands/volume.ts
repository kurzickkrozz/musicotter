import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Set or show the current volume',
	preconditions: ['BoundTextChannel', 'InVoiceChannel', 'DJOnly']
})
export class VolumeCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('volume')
				.setDescription('Set or show the current volume')
				.addIntegerOption((option) =>
					option.setName('level').setDescription('Volume level (0-150)').setRequired(false).setMinValue(0).setMaxValue(150)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
		}

		const level = interaction.options.getInteger('level');

		if (level === null) {
			autoDelete(interaction);
			return interaction.reply({ content: `Current volume: **${manager.volume}%**`, ephemeral: true });
		}

		manager.setVolume(level);
		autoDelete(interaction);
		return interaction.reply({ content: `Volume set to: **${manager.volume}%**`, ephemeral: true });
	}
}
