import { WorkerQueue } from '$lib/services/worker-queue.services';
import type {
	WithoutWorkerId,
	WorkerData,
	WorkerId,
	WorkerListener,
	WorkerPostMessageData
} from '$lib/types/worker';
import { isNullish } from '@dfinity/utils';

export abstract class AppWorker {
	readonly #worker: Worker;
	readonly #workerId: WorkerId;
	readonly #isSingleton: boolean;
	readonly #queue: WorkerQueue;
	// TODO: use generics directly in the class so that we can use type WorkerListener
	#listener: ((ev: MessageEvent) => void) | undefined;

	static #singletonWorker?: Worker;

	protected constructor(workerData: WorkerData) {
		const { worker, isSingleton } = workerData;

		this.#worker = worker;
		this.#workerId = crypto.randomUUID();
		this.#isSingleton = isSingleton;
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

	#addMessageListener = <T extends WorkerPostMessageData>(listener: WorkerListener<T>) => {
		this.#worker.addEventListener('message', listener);
		this.#listener = listener;
	};

	#removeListener = () => {
		if (isNullish(this.#listener)) {
			return;
		}

		this.#worker.removeEventListener('message', this.#listener);

		this.#listener = undefined;
	};

	#setOnMessageAsSingleton = <T extends WorkerPostMessageData>(listener: WorkerListener<T>) => {
		this.#addMessageListener(listener);
	};

	protected setOnMessage = <T extends WorkerPostMessageData>(listener: WorkerListener<T>) => {
		if (this.#isSingleton) {
			this.#setOnMessageAsSingleton(listener);
			return;
		}

		this.#worker.onmessage = listener;
	};

	protected postMessage = <T>(data: WithoutWorkerId<T>) => {
		// Route via queue to enforce back-pressure
		this.#queue.send({ ...data, workerId: this.#workerId });
	};

	terminate = () => {
		if (this.#isSingleton) {
			// If it's a singleton, we could have several listeners on the same instance of the worker and we cannot terminate it.
			// Ideally, we should have a way to terminate the worker if we find out that there are no more listeners on it.
			// TODO: Terminate the worker when there are no more listeners even from other instances of `AppWorker`.
			this.#removeListener();
			return;
		}

		this.#worker.terminate();

		this.#worker.onmessage = null;
	};

	protected abstract stopTimer(): void;

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
	};
}
