import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { Client as GeniusClient } from 'genius-lyrics';
import { EMBED_COLOR } from '../lib/constants';
import { autoDelete } from '../lib/utils';

const genius = new GeniusClient();

@ApplyOptions<Command.Options>({
	description: 'Show lyrics for a song (uses Genius)',
	preconditions: ['Blacklisted', 'BoundTextChannel']
})
export class LyricsCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('lyrics')
				.setDescription('Show lyrics for a song (uses Genius)')
				.addStringOption((option) => option.setName('song').setDescription('Song name to search for (defaults to currently playing)').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		let query = interaction.options.getString('song');

		// If no query provided, use the currently playing track
		if (!query) {
			const manager = this.container.musicManagers.get(interaction.guildId!);
			const current = manager?.queue.current;

			if (!current) {
				autoDelete(interaction);
				return interaction.reply({ content: 'Nothing is playing and no song name was provided.', ephemeral: true });
			}

			query = current.title;
		}

		await interaction.deferReply({ ephemeral: true });

		try {
			const songs = await genius.songs.search(query);

			if (!songs || songs.length === 0) {
				autoDelete(interaction);
				return interaction.editReply(`No lyrics found for: **${query}**`);
			}

			const song = songs[0];
			let lyrics = await song.lyrics();

			if (!lyrics || lyrics.trim().length === 0) {
				autoDelete(interaction);
				return interaction.editReply(`No lyrics available for: **${song.title}**`);
			}

			// Clean up Genius preamble (contributors, translations, description)
			const readMoreIndex = lyrics.indexOf('Read More');
			if (readMoreIndex !== -1 && readMoreIndex < 600) {
				lyrics = lyrics.substring(readMoreIndex + 'Read More'.length).trimStart();
			}

			// Strip trailing "Embed" text that Genius sometimes appends
			lyrics = lyrics.replace(/\d*Embed$/, '').trimEnd();

			// Discord embed description limit is 4096 characters
			const MAX_LENGTH = 4096;
			let truncated = false;

			if (lyrics.length > MAX_LENGTH - 100) {
				lyrics = lyrics.substring(0, MAX_LENGTH - 100);
				// Cut at the last complete line
				const lastNewline = lyrics.lastIndexOf('\n');
				if (lastNewline > 0) lyrics = lyrics.substring(0, lastNewline);
				truncated = true;
			}

			const embed = new EmbedBuilder()
				.setColor(EMBED_COLOR)
				.setTitle(`\u{1F3B6} ${song.title}`)
				.setURL(song.url)
				.setDescription(lyrics + (truncated ? `\n\n[\u2026 Full lyrics on Genius](${song.url})` : ''))
				.setFooter({ text: `${song.artist?.name ?? 'Unknown Artist'} \u2022 Powered by Genius` });

			if (song.thumbnail) {
				embed.setThumbnail(song.thumbnail);
			}

			autoDelete(interaction);
			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			this.container.logger.error('Lyrics command error:', error);
			autoDelete(interaction);
			return interaction.editReply(`Failed to fetch lyrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
