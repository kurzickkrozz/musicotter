import { join } from 'path';

export const rootDir = join(__dirname, '..', '..');
export const srcDir = join(rootDir, 'src');

export const EMBED_COLOR = 0x8b5e3c;
export const BOT_NAME = 'musicotter';
// Single source of truth — reads from package.json
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const BOT_VERSION: string = require('../../package.json').version;
export const BOT_OWNER = 'TunnelRat';
export const OWNER_ID = '118895880509194243';
export const PREFIX = '/';
