import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { join } from 'path';
import { EMBED_COLOR, BOT_NAME, rootDir } from '../lib/constants';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'List all available commands',
	preconditions: ['Blacklisted', 'BoundTextChannel']
})
export class HelpCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('help').setDescription('List all available commands'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const logo = new AttachmentBuilder(join(rootDir, 'logo.png'), { name: 'logo.png' });

		const embed = new EmbedBuilder()
			.setColor(EMBED_COLOR)
			.setAuthor({ name: BOT_NAME, iconURL: 'attachment://logo.png' })
			.setThumbnail('attachment://logo.png')
			.setDescription(
				[
					`Hey **${interaction.user.displayName}**! \u{1F3B6} I'm your multi-source music companion.`,
					'',
					'\u{1F30E} **Supported Sources**',
					'> \u{1F534} YouTube \u2022 \u{1F7E2} Spotify \u2022 \u{1F7E0} SoundCloud',
					'',
					'\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'
				].join('\n')
			)
			.addFields(
				{
					name: '\u{1F3B5} Playback',
					value: [
						'\u25B8 </play:0> \u2014 Play a song or add it to the queue',
						'\u25B8 </search:0> \u2014 Search YouTube and pick from top 5',
						'\u25B8 </scsearch:0> \u2014 Search SoundCloud and pick from top 5',
						'\u25B8 </playnext:0> \u2014 Add a song to the front of the queue',
						'\u25B8 </pause:0> \u2014 Pause the current track',
						'\u25B8 </resume:0> \u2014 Resume playback',
						'\u25B8 </skip:0> \u2014 Skip the current track',
						'\u25B8 </replay:0> \u2014 Replay the current track from the beginning',
						'\u25B8 </seek:0> \u2014 Seek to a position in the current track',
						'\u25B8 \u{1F512} </skipto:0> \u2014 Jump to a queue position',
						'\u25B8 \u{1F512} </stop:0> \u2014 Stop playback, clear the queue, and disconnect',
						'\u25B8 </radiostations:0> \u2014 Browse pre-configured radio stations'
					].join('\n')
				},
				{
					name: '\u200B',
					value: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'
				},
				{
					name: '\u{1F4CB} Queue',
					value: [
						'\u25B8 </queue:0> \u2014 View the current queue with pagination',
						'\u25B8 </nowplaying:0> \u2014 Show the current track with progress bar',
						'\u25B8 </loop:0> \u2014 Set loop mode (off / track / queue)',
						'\u25B8 </shuffle:0> \u2014 Shuffle the upcoming queue',
						'\u25B8 </remove:0> \u2014 Remove a track by queue position',
						'\u25B8 </history:0> \u2014 View recently played tracks',
						'\u25B8 \u{1F512} </clearqueue:0> \u2014 Clear all upcoming tracks',
						'\u25B8 \u{1F512} </movetrack:0> \u2014 Move a track to a different position'
					].join('\n')
				},
				{
					name: '\u200B',
					value: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'
				},
				{
					name: '\u2699\uFE0F Settings & Admin',
					value: [
						'\u25B8 \u{1F512} </volume:0> \u2014 View or set volume (0\u2013150)',
						'\u25B8 \u{1F6E1}\uFE0F </setdj:0> \u2014 View or set the DJ role (Manage Server)',
						'\u25B8 \u{1F512} </settc:0> \u2014 Bind bot messages to a text channel',
						'\u25B8 \u{1F512} </setvc:0> \u2014 Restrict bot to a voice channel',
						'\u25B8 \u{1F512} </forceremove:0> \u2014 Remove all tracks by a user',
						'\u25B8 \u{1F512} </blacklist:0> \u2014 Add, remove, or list blacklisted users'
					].join('\n')
				},
				{
					name: '\u200B',
					value: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'
				},
				{
					name: '\u2139\uFE0F Info',
					value: [
						'\u25B8 </lyrics:0> \u2014 Show lyrics (defaults to current track)',
						'\u25B8 </help:0> \u2014 Show this message',
						'\u25B8 </about:0> \u2014 Bot info, uptime & stats',
						'\u25B8 </ping:0> \u2014 Check latency'
					].join('\n')
				},
				{
					name: '\u200B',
					value: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'
				},
				{
					name: '\u{1F6E0}\uFE0F Owner Only',
					value: [
						'\u25B8 </debug:0> \u2014 Runtime & server debug info',
						'\u25B8 </evaluate:0> \u2014 View recent bot logs',
						'\u25B8 </invite:0> \u2014 Get the bot invite link'
					].join('\n')
				}
			)
			.setFooter({
				text: `\u{1F512} = Requires DJ role or Manage Server permission\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nDeveloped by TunnelRat \u{1F3B5}\nCurrent time: ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`,
				iconURL: 'attachment://logo.png'
			});

		await interaction.deferReply({ ephemeral: true });

		try {
			const dmChannel = await interaction.user.createDM();
			await dmChannel.send({ embeds: [embed], files: [logo] });
			autoDelete(interaction);
			return interaction.editReply({ content: '\u{1F4EC} Check your DMs!' });
		} catch {
			autoDelete(interaction);
			return interaction.editReply({
				content: "I couldn't send you a DM. Please make sure your DMs are open."
			});
		}
	}
}
