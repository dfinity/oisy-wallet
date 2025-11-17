import { WorkerQueue } from '$lib/services/worker-queue.services';
import type { WorkerData, WorkerListener, WorkerPostMessageData } from '$lib/types/worker';
import { isNullish } from '@dfinity/utils';

export abstract class AppWorker {
	readonly #worker: Worker;
	readonly #queue: WorkerQueue;

	static #singletonWorker?: Worker;

	protected constructor(workerData: WorkerData) {
		const { worker } = workerData;

		this.#worker = worker;
		this.#queue = new WorkerQueue(worker);
	}

	static #newInstance = async (): Promise<Worker> => {
		const Workers = await import('$lib/workers/workers?worker');
		return new Workers.default();
	};

	static #getInstanceAsSingleton = async (): Promise<Worker> => {
		if (isNullish(this.#singletonWorker)) {
			this.#singletonWorker = await this.#newInstance();
		}

		return this.#singletonWorker;
	};

	static getInstance = async (
		{ asSingleton = false }: { asSingleton?: boolean } = { asSingleton: false }
	): Promise<WorkerData> => {
		const worker = asSingleton ? await this.#getInstanceAsSingleton() : await this.#newInstance();

		return { worker, isSingleton: asSingleton };
	};

	protected setOnMessage = <T extends WorkerPostMessageData>(listener: WorkerListener<T>) => {
		this.#worker.onmessage = listener;
	};

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
