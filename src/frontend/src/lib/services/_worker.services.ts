import { WorkerQueue } from '$lib/services/worker-queue.services';
import type { WithoutWorkerId, WorkerData, WorkerId } from '$lib/types/worker';
import { workerPoolSize } from '$lib/utils/device.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

type MessageHandler = (ev: MessageEvent) => void;

export abstract class AppWorker {
	readonly #worker: Worker;
	readonly #workerId: WorkerId;
	readonly #poolIndex: number | undefined;
	readonly #queue: WorkerQueue;
	// TODO: use generics directly in the class so that we can use type WorkerListener
	#listener: ((ev: MessageEvent) => void) | undefined;
	#isTerminated = false;

	// Shared worker pool. Wallet workers opt in via `getInstance({ pooled: true })` and are sharded
	// across a small number of realms (keyed by a stable token id) instead of one realm per token.
	// The map holds the in-flight creation promise so concurrent callers share a single realm.
	// Ref counts are reserved synchronously in `getInstance` (not on wrapper construction) so a
	// destroy of the last sibling wrapper racing an in-flight init cannot tear the realm down early.
	static #pool = new Map<number, Promise<Worker>>();
	static #poolRefCounts = new Map<number, number>();
	static #poolSize: number | undefined;

	// Every underlying Worker ever spawned and not yet terminated, so that all
	// threads can be torn down at once when the page unloads.
	static #liveWorkers = new Set<Worker>();

	protected constructor(workerData: WorkerData) {
		const { worker, poolIndex } = workerData;

		this.#worker = worker;
		this.#workerId = crypto.randomUUID();
		this.#poolIndex = poolIndex;
		this.#queue = new WorkerQueue(worker);
	}

	static #newInstance = async (): Promise<Worker> => {
		const Workers = await import('$lib/workers/workers?worker');
		const worker = new Workers.default();
		AppWorker.#liveWorkers.add(worker);
		return worker;
	};

	static #resolvedPoolSize = (): number => {
		if (isNullish(this.#poolSize)) {
			this.#poolSize = workerPoolSize();
		}

		return this.#poolSize;
	};

	// Stable, non-negative hash so a given token always maps to the same pool worker across
	// stop/start cycles — the scheduler on that worker holds per-token delta state.
	static #hashKey = (key: string): number => {
		let hash = 0;

		for (let i = 0; i < key.length; i++) {
			hash = (hash * 31 + key.charCodeAt(i)) | 0;
		}

		return Math.abs(hash);
	};

	static #poolIndexForKey = (key: string | undefined): number => {
		const size = this.#resolvedPoolSize();

		if (size <= 1 || isNullish(key)) {
			return 0;
		}

		return this.#hashKey(key) % size;
	};

	static #getPooledWorker = (index: number): Promise<Worker> => {
		const existing = this.#pool.get(index);

		if (nonNullish(existing)) {
			return existing;
		}

		// Store the in-flight promise (not the resolved worker) so concurrent callers targeting the
		// same index share one realm instead of racing to create duplicates.
		const created = this.#newInstance();

		this.#pool.set(index, created);
		this.#poolRefCounts.set(index, 0);

		return created;
	};

	static getInstance = async ({
		pooled = false,
		poolKey
	}: { pooled?: boolean; poolKey?: string } = {}): Promise<WorkerData> => {
		if (!pooled) {
			return { worker: await this.#newInstance() };
		}

		const poolIndex = this.#poolIndexForKey(poolKey);
		const created = this.#getPooledWorker(poolIndex);

		// Reserve this wrapper's reference before awaiting: a concurrent destroy of the last sibling
		// wrapper must not see a ref count of zero — it would terminate the realm and this wrapper
		// would silently attach to a dead Worker.
		this.#poolRefCounts.set(poolIndex, (this.#poolRefCounts.get(poolIndex) ?? 0) + 1);

		try {
			return { worker: await created, poolIndex };
		} catch (err: unknown) {
			// A failed realm creation (e.g. a stale chunk after a redeploy) must not poison the pool
			// slot: drop the cached rejection so the next caller retries with a fresh worker. No
			// wrapper was ever constructed on this realm, so the whole slot bookkeeping goes with it —
			// unless another caller already cleaned up and recreated the slot.
			if (this.#pool.get(poolIndex) === created) {
				this.#pool.delete(poolIndex);
				this.#poolRefCounts.delete(poolIndex);
			}

			throw err;
		}
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

	protected setOnMessage = (listener: MessageHandler) => {
		// A pooled worker is shared by several wrappers, so each registers its own message listener
		// and filters by `ref`. A dedicated worker can own the single `onmessage` handler.
		if (nonNullish(this.#poolIndex)) {
			this.#addMessageListener(listener);
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

		if (isNullish(this.#poolIndex)) {
			this.#worker.terminate();

			this.#worker.onmessage = null;

			AppWorker.#liveWorkers.delete(this.#worker);

			return;
		}

		// A pooled worker is shared: drop this wrapper's listener and only terminate the underlying
		// Worker once the last wrapper on that pool index is gone.
		this.#removeListener();

		const remaining = (AppWorker.#poolRefCounts.get(this.#poolIndex) ?? 1) - 1;

		if (remaining <= 0) {
			this.#worker.terminate();
			AppWorker.#liveWorkers.delete(this.#worker);
			AppWorker.#pool.delete(this.#poolIndex);
			AppWorker.#poolRefCounts.delete(this.#poolIndex);
			return;
		}

		AppWorker.#poolRefCounts.set(this.#poolIndex, remaining);
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

		AppWorker.#pool.clear();
		AppWorker.#poolRefCounts.clear();
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
		this.#pool.clear();
		this.#poolRefCounts.clear();
		this.#poolSize = undefined;
		this.#liveWorkers.clear();
	}
}
