export abstract class AppWorker {
	readonly #worker: Worker;

	protected constructor(worker: Worker) {
		this.#worker = worker;
	}

	static async getInstance(): Promise<Worker> {
		const Workers = await import('$lib/workers/workers?worker');
		return new Workers.default();
	}

	protected postMessage = <T>(data: T) => {
		this.#worker.postMessage(data);
	};

	terminate = () => {
		this.#worker.terminate();
	};

	protected abstract stopTimer(): void;

	protected destroyCallback = (): void => {
		// default: do nothing
	};

	// Used internally to control destruction state. Do not expose or override.
	private isDestroying = false;

	destroy = () => {
		if (this.isDestroying) {
			return;
		}
		this.isDestroying = true;
		this.stopTimer();
		this.terminate();
		this.isDestroying = false;
		this.destroyCallback();
	};
}
