import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { OWNER_ID } from '../lib/constants';

@ApplyOptions<Command.Options>({
	description: 'Get the bot invite link (owner only)'
})
export class InviteLinkCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('invitelink').setDescription('Get the bot invite link (owner only)'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (interaction.user.id !== OWNER_ID) {
			return interaction.reply({ content: 'This command is restricted to the bot owner.', ephemeral: true });
		}

		return interaction.reply({
			content: 'https://discord.com/oauth2/authorize?client_id=1473987768706400306',
			ephemeral: true
		});
	}
}
