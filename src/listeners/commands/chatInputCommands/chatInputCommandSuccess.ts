import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ChatInputCommandSuccessPayload } from '@sapphire/framework';
import { logSuccessCommand } from '../../../lib/utils';

@ApplyOptions<Listener.Options>({ event: Events.ChatInputCommandSuccess })
export class ChatInputCommandSuccessListener extends Listener {
	public override run(payload: ChatInputCommandSuccessPayload) {
		logSuccessCommand(payload);
		this.container.musicManagers.recordUserInteraction(payload.interaction.user.id);
	}
}
