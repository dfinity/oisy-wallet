import { WorkerQueue } from '$lib/services/worker-queue.services';
import type {
	PostMessage,
	PostMessageDataRequest,
	PostMessageDataResponseLoose
} from '$lib/types/post-message';
import { isNullish } from '@dfinity/utils';

export interface WorkerData {
	worker: Worker;
	isSingleton: boolean;
}

export abstract class AppWorker {
	readonly #worker: Worker;
	readonly #queue: WorkerQueue;

	private static _singletonWorker?: Worker;

	protected constructor(workerData: WorkerData) {
		const { worker } = workerData;

		this.#worker = worker;
		this.#queue = new WorkerQueue(worker);
	}

	protected static async newInstance(): Promise<Worker> {
		const Workers = await import('$lib/workers/workers?worker');
		return new Workers.default();
	}

	protected static async getInstanceAsSingleton(): Promise<Worker> {
		if (isNullish(this._singletonWorker)) {
			this._singletonWorker = await this.newInstance();
		}

		return this._singletonWorker;
	}

	static async getInstance(
		{ asSingleton = false }: { asSingleton?: boolean } = { asSingleton: false }
	): Promise<WorkerData> {
		const worker = asSingleton ? await this.getInstanceAsSingleton() : await this.newInstance();

		return { worker, isSingleton: asSingleton };
	}

	protected setOnMessage = <T extends PostMessageDataRequest | PostMessageDataResponseLoose>(
		fn: (ev: MessageEvent<PostMessage<T>>) => void
	) => {
		this.#worker.onmessage = fn;
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
