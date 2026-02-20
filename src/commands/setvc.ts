import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType } from 'discord.js';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Set or clear the voice channel the bot is allowed to join',
	preconditions: ['BoundTextChannel', 'DJOnly']
})
export class SetVCCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('setvc')
				.setDescription('Set or clear the voice channel the bot is allowed to join')
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('Voice channel to restrict the bot to (leave empty to allow all channels)')
						.addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
						.setRequired(false)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const channel = interaction.options.getChannel('channel');
		const manager = this.container.musicManagers.getOrCreate(interaction.guildId!);

		if (channel) {
			manager.boundVoiceChannelId = channel.id;
			autoDelete(interaction);
			return interaction.reply(`Bot restricted to voice channel <#${channel.id}>.`);
		}

		manager.boundVoiceChannelId = null;
		autoDelete(interaction);
		return interaction.reply('Voice channel restriction cleared. The bot can now join any voice channel.');
	}
}
