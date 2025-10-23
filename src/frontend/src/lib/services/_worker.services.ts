import { WorkerQueue } from '$lib/services/worker-queue.services';

export abstract class AppWorker {
	readonly #worker: Worker;
	readonly #queue: WorkerQueue;

	protected constructor(worker: Worker) {
		this.#worker = worker;
		this.#queue = new WorkerQueue(worker);
	}

	static async getInstance(): Promise<Worker> {
		const Workers = await import('$lib/workers/workers?worker');
		return new Workers.default();
	}

	protected postMessage = <T>(data: T) => {
		// Route via queue to enforce back-pressure
		this.#queue.send(data);
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
