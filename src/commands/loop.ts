import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { LoopMode } from '../lib/types';
import { autoDelete } from '../lib/utils';

@ApplyOptions<Command.Options>({
	description: 'Set the loop mode',
	preconditions: ['BoundTextChannel', 'InVoiceChannel']
})
export class LoopCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('loop')
				.setDescription('Set the loop mode')
				.addStringOption((option) =>
					option
						.setName('mode')
						.setDescription('Loop mode (cycles through if not specified)')
						.setRequired(false)
						.addChoices(
							{ name: 'Off', value: LoopMode.Off },
							{ name: 'Track', value: LoopMode.Track },
							{ name: 'Queue', value: LoopMode.Queue }
						)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const manager = this.container.musicManagers.get(interaction.guildId!);

		if (!manager) {
			autoDelete(interaction);
			return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
		}

		const modeArg = interaction.options.getString('mode') as LoopMode | null;

		if (modeArg) {
			manager.queue.loopMode = modeArg;
		} else {
			const cycle: LoopMode[] = [LoopMode.Off, LoopMode.Track, LoopMode.Queue];
			const currentIndex = cycle.indexOf(manager.queue.loopMode);
			manager.queue.loopMode = cycle[(currentIndex + 1) % cycle.length];
		}

		const modeNames: Record<LoopMode, string> = {
			[LoopMode.Off]: 'Off',
			[LoopMode.Track]: 'Track (repeating current)',
			[LoopMode.Queue]: 'Queue (looping entire queue)'
		};

		autoDelete(interaction);
		return interaction.reply({ content: `Loop mode set to: **${modeNames[manager.queue.loopMode]}**`, ephemeral: true });
	}
}
