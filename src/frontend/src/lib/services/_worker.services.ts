import { WorkerQueue } from '$lib/services/worker-queue.services';

export abstract class AppWorker {
	readonly #worker: Worker;
	readonly #queue: WorkerQueue;

	private static _worker: Worker | null = null;
	private static _clients = 0;

	private _listener?: (ev: MessageEvent) => void;

	protected constructor(protected readonly worker: Worker) {
		this.#worker = worker;
		this.#queue = new WorkerQueue(worker);
	}

	static async getInstance(): Promise<Worker> {
		const Workers = await import('$lib/workers/workers?worker');
		return new Workers.default();
	}

	static async getInstance2(): Promise<Worker> {
		if (this._worker) {
			this._clients++;
			return this._worker;
		}
		const Workers = await import('$lib/workers/workers?worker');
		this._worker = new Workers.default(); // module worker (vite ?worker)
		this._clients = 1;
		return this._worker;
	}

	protected addMessageListener<T = unknown>(fn: (ev: MessageEvent<T>) => void) {
		this._listener = fn as (ev: MessageEvent) => void;
		this.worker.addEventListener('message', this._listener);
	}

	protected removeMessageListener() {
		if (this._listener) {
			this.worker.removeEventListener('message', this._listener);
		}
		this._listener = undefined;
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
