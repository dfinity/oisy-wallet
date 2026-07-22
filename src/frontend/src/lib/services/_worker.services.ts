import { WorkerQueue } from '$lib/services/worker-queue.services';
import type { WithoutWorkerId, WorkerData, WorkerId } from '$lib/types/worker';
import { isNullish, nonNullish } from '@dfinity/utils';

type MessageHandler = (ev: MessageEvent) => void;

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

	// Every underlying Worker ever spawned and not yet terminated, so that all
	// threads can be torn down at once when the page unloads.
	static #liveWorkers = new Set<Worker>();

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
		const worker = new Workers.default();
		AppWorker.#liveWorkers.add(worker);
		return worker;
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

	#addMessageListener = (listener: MessageHandler) => {
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

	#setOnMessageAsSingleton = (listener: MessageHandler) => {
		this.#addMessageListener(listener);
	};

	protected setOnMessage = (listener: MessageHandler) => {
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

			AppWorker.#liveWorkers.delete(this.#worker);

			return;
		}

		// If it's a singleton, multiple `AppWorker` wrappers share the same underlying Worker.
		// We track wrapper instances (ref count) and terminate the singleton Worker when the last one is destroyed.
		this.#removeListener();

		AppWorker.#singletonRefCount--;

		if (AppWorker.#singletonRefCount <= 0 && nonNullish(AppWorker.#singletonWorker)) {
			AppWorker.#singletonWorker.terminate();
			AppWorker.#liveWorkers.delete(AppWorker.#singletonWorker);
			AppWorker.#singletonWorker = undefined;
			AppWorker.#singletonRefCount = 0;
		}
	};

	/**
	 * Terminates every worker thread spawned through this class, regardless of
	 * which service owns its wrapper.
	 *
	 * Meant for page unload: without it, the old document's worker threads stay
	 * resident while the next document boots its own, roughly doubling memory
	 * right after a reload. Termination is blunt (no per-service `destroy()`
	 * bookkeeping) because the document is going away anyway.
	 */
	static terminateAllWorkers = () => {
		AppWorker.#liveWorkers.forEach((worker) => worker.terminate());
		AppWorker.#liveWorkers.clear();

		AppWorker.#singletonWorker = undefined;
		AppWorker.#singletonRefCount = 0;
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
		this.#liveWorkers.clear();
	}
}
