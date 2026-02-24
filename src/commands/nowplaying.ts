import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { autoDelete, createNowPlayingEmbed } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Show the currently playing track',
	preconditions: ['Blacklisted', 'BoundTextChannel']
})
export class NowPlayingCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('nowplaying').setDescription('Show the currently playing track'));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);
		const current = manager?.queue.current;

		if (!current) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
		}

		const elapsed = Math.floor((Date.now() - manager!.playStartedAt) / 1000);
		const embed = createNowPlayingEmbed(current, manager!.volume, manager!.queue.loopMode, elapsed);

		autoDelete(interaction);
		return interaction.reply({ embeds: [embed], ephemeral: true });
	}
}
