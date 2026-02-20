import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
	description: 'Set the text channel for bot responses',
	preconditions: ['BoundTextChannel', 'DJOnly']
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

		return interaction.reply(`Bot responses bound to <#${interaction.channelId}>.`);
	}
}
