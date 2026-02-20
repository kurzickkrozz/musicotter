import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: "Check the bot's latency"
})
export class PingCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('ping').setDescription("Check the bot's latency"));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const sent = await interaction.reply({ content: 'Pinging...', ephemeral: true, fetchReply: true });
		const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
		const ws = this.container.client.ws.ping;

		autoDelete(interaction);
		return interaction.editReply(`Pong! Roundtrip: **${roundtrip}ms** | WebSocket: **${ws}ms**`);
	}
}
