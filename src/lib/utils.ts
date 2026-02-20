import { EmbedBuilder, type CommandInteraction } from 'discord.js';
import { container, type ChatInputCommandSuccessPayload } from '@sapphire/framework';
import { cyan } from 'colorette';
import { EMBED_COLOR } from './constants';
import { LoopMode, type Track } from './types';

export function formatDuration(seconds: number): string {
	if (seconds <= 0) return 'LIVE';
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

export function createProgressBar(current: number, total: number, length = 15): string {
	if (total <= 0) return '🔴 LIVE';
	const progress = Math.round((current / total) * length);
	return '▬'.repeat(Math.max(0, progress)) + '🔘' + '▬'.repeat(Math.max(0, length - progress));
}

export function createNowPlayingEmbed(track: Track, volume: number, loopMode: LoopMode, elapsedSeconds = 0): EmbedBuilder {
	const progressBar = createProgressBar(elapsedSeconds, track.duration);
	const elapsedStr = formatDuration(elapsedSeconds);
	const totalStr = formatDuration(track.duration);

	const loopIndicator = loopMode === LoopMode.Off ? '' : loopMode === LoopMode.Track ? ' | 🔂 Looping Track' : ' | 🔁 Looping Queue';

	return new EmbedBuilder()
		.setColor(EMBED_COLOR)
		.setTitle('Now Playing')
		.setDescription(
			`**[${track.title}](${track.url})**\n\n` +
				`${progressBar}\n` +
				`\`${elapsedStr} / ${totalStr}\`\n\n` +
				`🔊 Volume: ${volume}%${loopIndicator}`
		)
		.setThumbnail(track.thumbnail || null)
		.setFooter({ text: `Requested by ${track.requester.username}`, iconURL: track.requester.displayAvatarURL() });
}

export function createQueueEmbed(
	current: Track | null,
	tracks: readonly Track[],
	page: number,
	loopMode: LoopMode,
	volume: number
): EmbedBuilder {
	const TRACKS_PER_PAGE = 10;
	const totalPages = Math.max(1, Math.ceil(tracks.length / TRACKS_PER_PAGE));
	const safePage = Math.max(1, Math.min(page, totalPages));

	const start = (safePage - 1) * TRACKS_PER_PAGE;
	const end = start + TRACKS_PER_PAGE;
	const pageTracks = tracks.slice(start, end);

	let description = '';

	if (current) {
		description += `**Now Playing:**\n[${current.title}](${current.url}) | \`${formatDuration(current.duration)}\` | Requested by <@${current.requester.id}>\n\n`;
	}

	if (pageTracks.length > 0) {
		description += '**Up Next:**\n';
		description += pageTracks
			.map((t, i) => `\`${start + i + 1}.\` [${t.title}](${t.url}) | \`${formatDuration(t.duration)}\` | <@${t.requester.id}>`)
			.join('\n');
	} else if (!current) {
		description = 'The queue is empty.';
	}

	const loopStr = loopMode === LoopMode.Off ? 'Off' : loopMode === LoopMode.Track ? 'Track' : 'Queue';

	return new EmbedBuilder()
		.setColor(EMBED_COLOR)
		.setTitle(`Queue - ${tracks.length} track${tracks.length === 1 ? '' : 's'}`)
		.setDescription(description)
		.setFooter({ text: `Page ${safePage}/${totalPages} | Loop: ${loopStr} | Volume: ${volume}%` });
}

/**
 * Schedule an ephemeral interaction reply to be deleted after a delay.
 */
export function autoDelete(interaction: CommandInteraction, ms = 30_000): void {
	setTimeout(() => {
		interaction.deleteReply().catch(() => {});
	}, ms);
}

export function logSuccessCommand(payload: ChatInputCommandSuccessPayload): void {
	const { guild, user } = payload.interaction;
	const commandName = cyan(payload.command.name);
	const author = `${user.username}[${cyan(user.id)}]`;
	const sentAt = guild ? `${guild.name}[${cyan(guild.id)}]` : 'DMs';
	container.logger.debug(`${commandName} ${author} ${sentAt}`);
}
