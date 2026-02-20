import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { OWNER_ID } from '../lib/constants';

@ApplyOptions<Command.Options>({
	description: 'Show the last 30 lines of bot logs (owner only)',
	preconditions: ['BoundTextChannel']
})
export class EvaluateCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('evaluate').setDescription('Show the last 30 lines of bot logs (owner only)'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (interaction.user.id !== OWNER_ID) {
			return interaction.reply({ content: 'This command is restricted to the bot owner.', ephemeral: true });
		}

		const lines = this.container.logBuffer.getLastLines(30);
		const output = lines.length > 0 ? lines.join('\n') : 'No log output captured yet.';

		// Discord message limit is 2000 chars; use a code block and truncate if needed
		const codeBlock = `\`\`\`\n${output}\n\`\`\``;

		if (codeBlock.length <= 2000) {
			return interaction.reply({ content: codeBlock, ephemeral: true });
		}

		// Truncate from the front to keep the most recent lines visible
		const maxContentLen = 2000 - 8; // account for ```\n and \n```
		const truncated = output.slice(-maxContentLen);
		return interaction.reply({ content: `\`\`\`\n${truncated}\n\`\`\``, ephemeral: true });
	}
}
