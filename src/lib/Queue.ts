import { LoopMode, type Track } from './types';

export class Queue {
	private _tracks: Track[] = [];
	private _loopMode: LoopMode = LoopMode.Off;
	private _current: Track | null = null;

	public get tracks(): readonly Track[] {
		return this._tracks;
	}

	public get size(): number {
		return this._tracks.length;
	}

	public get current(): Track | null {
		return this._current;
	}

	public get loopMode(): LoopMode {
		return this._loopMode;
	}

	public set loopMode(mode: LoopMode) {
		this._loopMode = mode;
	}

	public enqueue(trackOrTracks: Track | Track[]): void {
		if (Array.isArray(trackOrTracks)) {
			this._tracks.push(...trackOrTracks);
		} else {
			this._tracks.push(trackOrTracks);
		}
	}

	public enqueueNext(track: Track): void {
		this._tracks.unshift(track);
	}

	public dequeue(): Track | null {
		if (this._loopMode === LoopMode.Track && this._current) {
			return this._current;
		}

		if (this._loopMode === LoopMode.Queue && this._current) {
			this._tracks.push(this._current);
		}

		const next = this._tracks.shift() ?? null;
		this._current = next;
		return next;
	}

	public peek(): Track | null {
		return this._tracks[0] ?? null;
	}

	/** Clear all tracks including current. Used by /stop. */
	public clear(): void {
		this._tracks = [];
		this._current = null;
	}

	/** Clear only upcoming tracks, keep current playing. Used by /clearqueue. */
	public clearUpcoming(): void {
		this._tracks = [];
	}

	/** Fisher-Yates in-place shuffle. O(n), unbiased. Does not touch _current. */
	public shuffle(): void {
		const arr = this._tracks;
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	}

	public removeByUser(userId: string): number {
		const before = this._tracks.length;
		this._tracks = this._tracks.filter((t) => t.requester.id !== userId);
		return before - this._tracks.length;
	}

	public skipTo(position: number): Track | null {
		const index = position - 1;
		if (index < 0 || index >= this._tracks.length) return null;
		this._tracks.splice(0, index);
		return this.dequeue();
	}

	/** Move a track from one position to another. Positions are 1-based. */
	public move(from: number, to: number): Track | null {
		const fromIndex = from - 1;
		const toIndex = to - 1;
		if (fromIndex < 0 || fromIndex >= this._tracks.length) return null;
		if (toIndex < 0 || toIndex >= this._tracks.length) return null;
		const [track] = this._tracks.splice(fromIndex, 1);
		this._tracks.splice(toIndex, 0, track);
		return track;
	}

	public setCurrent(track: Track | null): void {
		this._current = track;
	}
}
