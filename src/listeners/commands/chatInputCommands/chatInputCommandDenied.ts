import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ChatInputCommandDeniedPayload, type UserError } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { autoDelete } from '../../../lib/utils';

@ApplyOptions<Listener.Options>({ event: Events.ChatInputCommandDenied })
export class ChatInputCommandDeniedListener extends Listener {
	public override run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
		autoDelete(interaction);

		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({ content: error.message });
		}

		return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
	}
}
