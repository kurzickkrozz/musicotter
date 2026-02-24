import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Set the text channel for bot responses',
	preconditions: ['Blacklisted', 'BoundTextChannel', 'DJOnly']
})
export class SetTCCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName('settc').setDescription('Set the text channel for bot responses (now-playing messages)')
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.getOrCreate(interaction.guildId!);

		manager.boundTextChannelId = interaction.channelId;

		autoDelete(interaction);
		return interaction.reply({ content: `Bot responses bound to <#${interaction.channelId}>.`, ephemeral: true });
	}
}
