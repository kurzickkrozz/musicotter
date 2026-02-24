/**
 * Pre-configured radio stations (YouTube playlists).
 * Add new stations here — they will be sorted alphabetically at runtime.
 */
export interface RadioStation {
	name: string;
	url: string;
}

export const RADIO_STATIONS: RadioStation[] = [
	{ name: "2000's Alt Rock", url: 'https://www.youtube.com/playlist?list=PL6Lt9p1lIRZ311J9ZHuzkR5A3xesae2pk' },
	{ name: 'Electronic Hits', url: 'https://www.youtube.com/playlist?list=PLwYbh6dFU6lOxZ-trGiMLf813ZQiL1uQx' }
];

/** Stations sorted alphabetically by name. */
export const SORTED_STATIONS: RadioStation[] = [...RADIO_STATIONS].sort((a, b) => a.name.localeCompare(b.name));
