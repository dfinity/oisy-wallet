import { WorkerQueue } from '$lib/services/worker-queue.services';
import type {
	WithoutWorkerId,
	WorkerData,
	WorkerId,
	WorkerListener,
	WorkerPostMessageData
} from '$lib/types/worker';
import { isNullish, nonNullish } from '@dfinity/utils';

export abstract class AppWorker {
	readonly #worker: Worker;
	readonly #workerId: WorkerId;
	readonly #isSingleton: boolean;
	readonly #queue: WorkerQueue;
	// TODO: use generics directly in the class so that we can use type WorkerListener
	#listener: ((ev: MessageEvent) => void) | undefined;
	#isTerminated = false;

	static #singletonWorker?: Worker;
	static #singletonRefCount = 0;

	protected constructor(workerData: WorkerData) {
		const { worker, isSingleton } = workerData;

		this.#worker = worker;
		this.#workerId = crypto.randomUUID();
		this.#isSingleton = isSingleton;
		this.#queue = new WorkerQueue(worker);

		if (this.#isSingleton) {
			AppWorker.#singletonRefCount++;
		}
	}

	static #newInstance = async (): Promise<Worker> => {
		const Workers = await import('$lib/workers/workers?worker');
		return new Workers.default();
	};

	static #getInstanceAsSingleton = async (): Promise<Worker> => {
		if (isNullish(this.#singletonWorker)) {
			this.#singletonWorker = await this.#newInstance();
			this.#singletonRefCount = 0;
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
		// Guard against double-terminate on the same instance
		if (this.#isTerminated) {
			return;
		}

		this.#isTerminated = true;

		if (!this.#isSingleton) {
			this.#worker.terminate();

			this.#worker.onmessage = null;

			return;
		}

		// If it's a singleton, multiple `AppWorker` wrappers share the same underlying Worker.
		// We track wrapper instances (ref count) and terminate the singleton Worker when the last one is destroyed.
		this.#removeListener();

		AppWorker.#singletonRefCount--;

		if (AppWorker.#singletonRefCount <= 0 && nonNullish(AppWorker.#singletonWorker)) {
			AppWorker.#singletonWorker.terminate();
			AppWorker.#singletonWorker = undefined;
			AppWorker.#singletonRefCount = 0;
		}
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

	/**
	 * Reset the internal state of the worker service.
	 * This is notably useful for testing purposes to ensure that each test starts with a clean state.
	 */
	static resetForTesting() {
		if (nonNullish(this.#singletonWorker)) {
			this.#singletonWorker.terminate();
			this.#singletonWorker = undefined;
		}
		this.#singletonRefCount = 0;
	}
}
