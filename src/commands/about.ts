import { ApplyOptions } from '@sapphire/decorators';
import { Command, version as sapphireVersion } from '@sapphire/framework';
import { EmbedBuilder, version as djsVersion } from 'discord.js';
import { EMBED_COLOR, BOT_NAME, BOT_VERSION, BOT_OWNER, PREFIX } from '../lib/constants';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Show information about the bot',
	preconditions: ['Blacklisted', 'BoundTextChannel']
})
export class AboutCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('about').setDescription('Show information about the bot'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const { client } = this.container;
		const uptime = this.formatUptime(process.uptime());

		const embed = new EmbedBuilder()
			.setColor(EMBED_COLOR)
			.setTitle(BOT_NAME)
			.setDescription('A multi-source Discord music bot built by TunnelRat.')
			.addFields(
				{ name: 'Version', value: `v${BOT_VERSION}`, inline: true },
				{ name: 'Owner', value: BOT_OWNER, inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{ name: 'Prefix', value: `\`${PREFIX}\``, inline: true },
				{ name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
				{ name: 'Uptime', value: uptime, inline: true },
				{ name: 'Latency', value: `${client.ws.ping}ms`, inline: true },
				{ name: 'Discord.js', value: `v${djsVersion}`, inline: true },
				{ name: 'Sapphire', value: `v${sapphireVersion}`, inline: true },
				{ name: 'Node.js', value: process.version, inline: true }
			)
			.setFooter({ text: 'Powered by yt-dlp + @discordjs/voice' })
			.setTimestamp();

		if (client.user?.displayAvatarURL()) {
			embed.setThumbnail(client.user.displayAvatarURL());
		}

		autoDelete(interaction);
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}

	private formatUptime(seconds: number): string {
		const d = Math.floor(seconds / 86400);
		const h = Math.floor((seconds % 86400) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		const parts: string[] = [];
		if (d > 0) parts.push(`${d}d`);
		if (h > 0) parts.push(`${h}h`);
		if (m > 0) parts.push(`${m}m`);
		parts.push(`${s}s`);
		return parts.join(' ');
	}
}
