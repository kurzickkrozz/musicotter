import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { OWNER_ID } from '../lib/constants';

@ApplyOptions<Command.Options>({
	description: 'Get the bot invite link (owner only)',
	preconditions: ['BoundTextChannel']
})
export class InviteCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('invite').setDescription('Get the bot invite link (owner only)'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (interaction.user.id !== OWNER_ID) {
			return interaction.reply({ content: 'This command is restricted to the bot owner.', ephemeral: true });
		}

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel('Invite!')
				.setStyle(ButtonStyle.Link)
				.setURL('https://discord.com/oauth2/authorize?client_id=1473987768706400306')
		);

		return interaction.reply({ components: [row], ephemeral: true });
	}
}
