import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';
import { BOT_VERSION } from '../lib/constants';

const dev = process.env.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ once: true, event: 'clientReady' })
export class ReadyEvent extends Listener {
	private readonly style = dev ? yellow : blue;

	public override async run() {
		this.printBanner();
		this.printStoreDebugInformation();
		this.container.musicManagers.updatePresence();

		// In production (no DEV_GUILD_ID), clear any stale guild-specific command
		// registrations left over from development to prevent duplicate listings.
		if (!process.env.DEV_GUILD_ID) {
			const { client, logger } = this.container;
			for (const guild of client.guilds.cache.values()) {
				const guildCommands = await guild.commands.fetch();
				if (guildCommands.size > 0) {
					await guild.commands.set([]);
					logger.info(`Cleared ${guildCommands.size} stale guild commands from ${guild.name}`);
				}
			}
		}
	}

	private printBanner() {
		const success = green('+');
		const llc = dev ? magentaBright : white;
		const blc = dev ? magenta : blue;

		const line01 = llc('musicotter');
		const pad = ' '.repeat(2);

		console.log(
			String.raw`
${line01} ${pad}${blc(BOT_VERSION)}
${pad}${pad}[${success}] Gateway Connected
${dev ? `${pad}${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}

	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()];
		const last = stores.pop()!;

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore(store: StoreRegistryValue, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}
}
