import { Precondition } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';

export class BoundTextChannelPrecondition extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guildId) return this.ok();

		const manager = this.container.musicManagers.get(interaction.guildId);
		if (!manager?.boundTextChannelId) return this.ok();

		if (interaction.channelId === manager.boundTextChannelId) return this.ok();

		return this.error({
			message: `Bot commands are restricted to <#${manager.boundTextChannelId}>. Use \`/settc\` to change or unbind.`
		});
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		BoundTextChannel: never;
	}
}
