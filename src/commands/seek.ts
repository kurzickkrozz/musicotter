import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { formatDuration } from '../lib/utils';

/**
 * Parse a time string into total seconds.
 * Supports:
 *   - Colon-separated: HH:MM:SS, MM:SS, SS
 *   - Human-readable:  1h30m15s, 5m30s, 45s, 1h, 2m
 *   - Plain number:    90 (seconds)
 */
function parseTime(input: string): number | null {
	// Try colon-separated: HH:MM:SS or MM:SS or SS
	const colonMatch = input.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
	if (colonMatch) {
		return parseInt(colonMatch[1], 10) * 3600 + parseInt(colonMatch[2], 10) * 60 + parseInt(colonMatch[3], 10);
	}

	const mmssMatch = input.match(/^(\d+):(\d{1,2})$/);
	if (mmssMatch) {
		return parseInt(mmssMatch[1], 10) * 60 + parseInt(mmssMatch[2], 10);
	}

	// Try human-readable: 1h30m15s, 5m30s, 45s, etc.
	const humanMatch = input.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
	if (humanMatch && (humanMatch[1] || humanMatch[2] || humanMatch[3])) {
		const hours = parseInt(humanMatch[1] ?? '0', 10);
		const minutes = parseInt(humanMatch[2] ?? '0', 10);
		const seconds = parseInt(humanMatch[3] ?? '0', 10);
		return hours * 3600 + minutes * 60 + seconds;
	}

	// Try plain number (seconds)
	const plainMatch = input.match(/^(\d+)$/);
	if (plainMatch) {
		return parseInt(plainMatch[1], 10);
	}

	return null;
}

@ApplyOptions<Command.Options>({
	description: 'Seek to a position in the current track',
	preconditions: ['BoundTextChannel', 'InVoiceChannel']
})
export class SeekCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('seek')
				.setDescription('Seek to a position in the current track')
				.addStringOption((option) =>
					option
						.setName('time')
						.setDescription('Time to seek to: [+|-] HH:MM:SS, MM:SS, SS, or 1h2m3s')
						.setRequired(true)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const rawInput = interaction.options.getString('time', true).trim();
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager || !manager.queue.current) {
			return interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
		}

		const currentTrack = manager.queue.current;

		if (currentTrack.duration <= 0) {
			return interaction.reply({ content: 'Cannot seek in a live stream.', ephemeral: true });
		}

		if (!currentTrack.url.includes('youtube.com') && !currentTrack.url.includes('youtu.be')) {
			return interaction.reply({ content: 'Seeking is only supported for YouTube tracks.', ephemeral: true });
		}

		// Determine direction: +, -, or absolute
		let direction: '+' | '-' | 'absolute' = 'absolute';
		let timeStr = rawInput;

		if (rawInput.startsWith('+')) {
			direction = '+';
			timeStr = rawInput.substring(1).trim();
		} else if (rawInput.startsWith('-')) {
			direction = '-';
			timeStr = rawInput.substring(1).trim();
		}

		const parsedSeconds = parseTime(timeStr);
		if (parsedSeconds === null) {
			return interaction.reply({
				content: 'Invalid time format. Use `HH:MM:SS`, `MM:SS`, `SS`, `1h2m3s`, or a plain number of seconds.',
				ephemeral: true
			});
		}

		// Calculate the absolute seek position
		const currentElapsed = Math.floor((Date.now() - manager.playStartedAt) / 1000);
		let seekTo: number;

		if (direction === '+') {
			seekTo = currentElapsed + parsedSeconds;
		} else if (direction === '-') {
			seekTo = currentElapsed - parsedSeconds;
		} else {
			seekTo = parsedSeconds;
		}

		// Clamp to valid range
		seekTo = Math.max(0, Math.min(seekTo, currentTrack.duration - 1));

		await interaction.deferReply();

		const success = await manager.seek(seekTo);

		if (!success) {
			return interaction.editReply('Failed to seek. Please try again.');
		}

		const directionLabel =
			direction === '+' ? `Seeked forward to` : direction === '-' ? `Seeked backward to` : `Seeked to`;

		return interaction.editReply(`${directionLabel} **${formatDuration(seekTo)}** / ${formatDuration(currentTrack.duration)}`);
	}
}
