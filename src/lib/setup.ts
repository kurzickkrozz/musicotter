process.env.NODE_ENV ??= 'development';

import { ApplicationCommandRegistries, RegisterBehavior, container } from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import * as colorette from 'colorette';
import { config } from 'dotenv';
import { MusicManagerStore } from './MusicManagerStore';
import { AudioSourceResolver } from './AudioSourceResolver';
import { LogBuffer } from './LogBuffer';

config();

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

if (process.env.DEV_GUILD_ID) {
	ApplicationCommandRegistries.setDefaultGuildIds([process.env.DEV_GUILD_ID]);
}

colorette.createColors({ useColor: true });

container.musicManagers = new MusicManagerStore();
container.audioResolver = new AudioSourceResolver();
container.logBuffer = new LogBuffer();
container.logBuffer.install();

declare module '@sapphire/pieces' {
	interface Container {
		musicManagers: MusicManagerStore;
		audioResolver: AudioSourceResolver;
		logBuffer: LogBuffer;
	}
}
