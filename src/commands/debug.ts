import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { EMBED_COLOR, BOT_NAME, OWNER_ID } from '../lib/constants';

@ApplyOptions<Command.Options>({
	description: 'Show bot runtime debug information (owner only)',
	preconditions: ['BoundTextChannel']
})
export class DebugCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('debug').setDescription('Show bot runtime debug information (owner only)'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (interaction.user.id !== OWNER_ID) {
			return interaction.reply({ content: 'This command is restricted to the bot owner.', ephemeral: true });
		}

		const embeds = this.buildDebugEmbeds();
		return interaction.reply({ embeds, ephemeral: true });
	}

	private buildDebugEmbeds(): EmbedBuilder[] {
		const mem = process.memoryUsage();
		const totalMemMB = (mem.heapTotal / 1024 / 1024).toFixed(2);
		const usedMemMB = (mem.heapUsed / 1024 / 1024).toFixed(2);

		const store = this.container.musicManagers;
		const totalTracks = store.totalTracksPlayed;
		const totalSeconds = store.totalPlayTimeSeconds;
		const totalTime = this.formatTotalTime(totalSeconds);
		const uniqueUsers = store.totalUniqueUsers;

		const guilds = this.container.client.guilds.cache;
		const guildList = guilds.map((g) => `\u2022 ${g.name} (\`${g.id}\`)`).join('\n') || 'None';

		const runtimeEmbed = new EmbedBuilder()
			.setColor(EMBED_COLOR)
			.setTitle(`${BOT_NAME} - Debug`)
			.addFields(
				{ name: 'Runtime Information', value: '\u200B' },
				{ name: 'Total Memory', value: `${totalMemMB} MB`, inline: true },
				{ name: 'Used Memory', value: `${usedMemMB} MB`, inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{ name: 'Tracks Played', value: `${totalTracks}`, inline: true },
				{ name: 'Total Play Time', value: totalTime, inline: true },
				{ name: '\u200B', value: '\u200B', inline: true }
			)
			.setTimestamp();

		const discordEmbed = new EmbedBuilder()
			.setColor(EMBED_COLOR)
			.addFields(
				{ name: 'Discord Information', value: '\u200B' },
				{ name: 'Total Guilds', value: `${guilds.size}`, inline: true },
				{ name: 'Unique Users', value: `${uniqueUsers}`, inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{ name: 'Guild List', value: guildList.length > 1024 ? guildList.slice(0, 1021) + '...' : guildList }
			)
			.setFooter({ text: 'Owner-only debug information' });

		return [runtimeEmbed, discordEmbed];
	}

	private formatTotalTime(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}
}
