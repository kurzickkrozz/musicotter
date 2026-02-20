/**
 * Ring buffer that captures stdout/stderr output for the /evaluate command.
 * Stores the most recent `maxLines` of log output.
 */
export class LogBuffer {
	private readonly _lines: string[] = [];
	private readonly _maxLines: number;

	public constructor(maxLines = 200) {
		this._maxLines = maxLines;
	}

	/** Start intercepting stdout and stderr writes. */
	public install(): void {
		const origStdoutWrite = process.stdout.write.bind(process.stdout);
		const origStderrWrite = process.stderr.write.bind(process.stderr);

		process.stdout.write = ((chunk: unknown, ...args: unknown[]): boolean => {
			this.push(String(chunk));
			return (origStdoutWrite as Function)(chunk, ...args);
		}) as typeof process.stdout.write;

		process.stderr.write = ((chunk: unknown, ...args: unknown[]): boolean => {
			this.push(String(chunk));
			return (origStderrWrite as Function)(chunk, ...args);
		}) as typeof process.stderr.write;
	}

	/** Get the last `n` lines of log output. */
	public getLastLines(n: number): string[] {
		return this._lines.slice(-n);
	}

	private push(text: string): void {
		const lines = text.split('\n').filter((l) => l.length > 0);
		for (const line of lines) {
			this._lines.push(line);
			if (this._lines.length > this._maxLines) {
				this._lines.shift();
			}
		}
	}
}
