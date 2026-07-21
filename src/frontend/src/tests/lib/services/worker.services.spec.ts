import { AppWorker } from '$lib/services/_worker.services';
import type { WorkerData } from '$lib/types/worker';
import { workerPoolSize } from '$lib/utils/device.utils';

const postMessageSpy = vi.fn();
const addEventListenerSpy = vi.fn();
const removeEventListenerSpy = vi.fn();

class MockWorker {
	postMessage = postMessageSpy;
	onmessage: ((event: MessageEvent) => void) | null = null;
	terminate: () => void = vi.fn();
	addEventListener = addEventListenerSpy;
	removeEventListener = removeEventListenerSpy;
}

let workerInstance: Worker;

vi.mock('$lib/workers/workers?worker', () => {
	class MockWorkers {
		constructor() {
			// @ts-expect-error testing this on purpose with a mock class
			workerInstance = new Worker();
			return workerInstance;
		}
	}

	return {
		default: MockWorkers
	};
});

vi.mock(import('$lib/utils/device.utils'), async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...actual,
		workerPoolSize: vi.fn()
	};
});

describe('_worker.services', () => {
	describe('AppWorker', () => {
		const listenerSpy = vi.fn();
		const stopTimerSpy = vi.fn();

		// Pool size 4 keeps the sharding deterministic for the keys used below:
		// `#hashKey('a') % 4 === 1`, `'b' % 4 === 2`, `'e' % 4 === 1` (collides with `'a'`).
		const POOL_SIZE = 4;

		class TestWorker extends AppWorker {
			constructor(worker: WorkerData) {
				super(worker);
			}

			protected stopTimer(): void {
				stopTimerSpy();
			}

			setListener = this.setOnMessage;

			sendMessage = this.postMessage;
		}

		const createTestWorker = async (): Promise<{ instance: TestWorker; worker: WorkerData }> => {
			const worker = await AppWorker.getInstance();
			const instance = new TestWorker(worker);
			return { instance, worker };
		};

		const createTestWorkerPooled = async (
			poolKey: string
		): Promise<{ instance: TestWorker; worker: WorkerData }> => {
			const worker = await AppWorker.getInstance({ pooled: true, poolKey });
			const instance = new TestWorker(worker);
			return { instance, worker };
		};

		const mockId = 'abcdefgh';

		beforeEach(() => {
			vi.clearAllMocks();

			vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

			vi.stubGlobal('crypto', {
				randomUUID: vi.fn().mockReturnValueOnce(mockId).mockReturnValueOnce('0000')
			});

			vi.mocked(workerPoolSize).mockReturnValue(POOL_SIZE);

			AppWorker.resetForTesting();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should initialise a worker instance and return WorkerData', async () => {
			const worker = await AppWorker.getInstance();

			expect(worker.worker).toBeInstanceOf(Worker);
			expect(worker.poolIndex).toBeUndefined();
		});

		it('should return different workers by default', async () => {
			const first = await AppWorker.getInstance();
			const second = await AppWorker.getInstance();

			expect(first.worker).not.toBe(second.worker);
			expect(first.poolIndex).toBeUndefined();
			expect(second.poolIndex).toBeUndefined();
		});

		it('should set onmessage listener via setOnMessage', async () => {
			const { instance, worker } = await createTestWorker();

			instance.setListener(listenerSpy);

			expect(worker.worker.onmessage).toStrictEqual(listenerSpy);

			expect(addEventListenerSpy).not.toHaveBeenCalled();
		});

		it('should route postMessage through WorkerQueue with workerId attached', async () => {
			const { instance } = await createTestWorker();

			const payload = { foo: 'bar' };
			instance.sendMessage(payload);

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				...payload,
				workerId: mockId
			});
		});

		it('should terminate the underlying worker when terminate is called', async () => {
			const { instance, worker } = await createTestWorker();

			instance.terminate();

			expect(worker.worker.terminate).toHaveBeenCalledExactlyOnceWith();
		});

		it('should terminate the underlying worker when destroy is called', async () => {
			const { instance, worker } = await createTestWorker();

			instance.setListener(listenerSpy);

			instance.destroy();

			expect(stopTimerSpy).toHaveBeenCalledExactlyOnceWith();

			expect(worker.worker.terminate).toHaveBeenCalledExactlyOnceWith();

			expect(worker.worker.removeEventListener).not.toHaveBeenCalled();

			expect(worker.worker.onmessage).toBeNull();
		});

		describe('when pooled', () => {
			it('should reuse the same worker for the same pool key', async () => {
				const first = await AppWorker.getInstance({ pooled: true, poolKey: 'a' });
				const second = await AppWorker.getInstance({ pooled: true, poolKey: 'a' });

				expect(first.worker).toBeInstanceOf(Worker);
				expect(second.worker).toBeInstanceOf(Worker);

				expect(first.worker).toBe(second.worker);

				expect(first.poolIndex).toBe(second.poolIndex);
				expect(first.poolIndex).toEqual(expect.any(Number));
			});

			it('should shard keys that hash to different indices onto different workers', async () => {
				const a = await AppWorker.getInstance({ pooled: true, poolKey: 'a' });
				const b = await AppWorker.getInstance({ pooled: true, poolKey: 'b' });

				expect(a.poolIndex).not.toBe(b.poolIndex);
				expect(a.worker).not.toBe(b.worker);
			});

			it('should share a worker between keys that hash to the same index', async () => {
				const a = await AppWorker.getInstance({ pooled: true, poolKey: 'a' });
				const e = await AppWorker.getInstance({ pooled: true, poolKey: 'e' });

				expect(a.poolIndex).toBe(e.poolIndex);
				expect(a.worker).toBe(e.worker);
			});

			it('should collapse the pool onto a single worker when the pool size is one (iOS)', async () => {
				vi.mocked(workerPoolSize).mockReturnValue(1);
				AppWorker.resetForTesting();

				const a = await AppWorker.getInstance({ pooled: true, poolKey: 'a' });
				const b = await AppWorker.getInstance({ pooled: true, poolKey: 'b' });

				expect(a.poolIndex).toBe(0);
				expect(b.poolIndex).toBe(0);
				expect(a.worker).toBe(b.worker);
			});

			it("should add a listener to the worker's message event", async () => {
				const { instance, worker } = await createTestWorkerPooled('a');

				instance.setListener(listenerSpy);

				expect(worker.worker.addEventListener).toHaveBeenCalledExactlyOnceWith(
					'message',
					listenerSpy
				);

				expect(worker.worker.onmessage).not.toStrictEqual(listenerSpy);
				expect(worker.worker.onmessage).toBeNull();
			});

			it('should keep the shared worker alive until the last wrapper is destroyed', async () => {
				const { instance: first, worker } = await createTestWorkerPooled('a');
				const { instance: second } = await createTestWorkerPooled('a');

				first.setListener(listenerSpy);
				second.setListener(listenerSpy);

				first.destroy();

				expect(worker.worker.removeEventListener).toHaveBeenCalledExactlyOnceWith(
					'message',
					listenerSpy
				);
				expect(worker.worker.terminate).not.toHaveBeenCalled();

				second.destroy();

				expect(worker.worker.terminate).toHaveBeenCalledOnce();
			});

			it('should not remove the listener twice on destroy', async () => {
				const { instance, worker } = await createTestWorkerPooled('a');

				instance.setListener(listenerSpy);

				instance.destroy();

				instance.destroy();

				expect(worker.worker.removeEventListener).toHaveBeenCalledExactlyOnceWith(
					'message',
					listenerSpy
				);
			});

			it('should spawn a fresh worker for a pool index after it was fully released', async () => {
				const { instance: first, worker } = await createTestWorkerPooled('a');

				first.destroy();

				const { worker: next } = await createTestWorkerPooled('a');

				expect(next.worker).not.toBe(worker.worker);
			});
		});

		describe('terminateAllWorkers', () => {
			it('should terminate every spawned worker', async () => {
				const { worker: first } = await createTestWorker();
				const { worker: second } = await createTestWorker();

				AppWorker.terminateAllWorkers();

				expect(first.worker.terminate).toHaveBeenCalledOnce();
				expect(second.worker.terminate).toHaveBeenCalledOnce();
			});

			it('should terminate pooled workers and reset the pool', async () => {
				const { worker } = await createTestWorkerPooled('a');

				AppWorker.terminateAllWorkers();

				expect(worker.worker.terminate).toHaveBeenCalledOnce();

				const next = await AppWorker.getInstance({ pooled: true, poolKey: 'a' });

				expect(next.worker).not.toBe(worker.worker);
			});

			it('should not terminate again a worker that was already destroyed', async () => {
				const { instance, worker } = await createTestWorker();

				instance.destroy();

				AppWorker.terminateAllWorkers();

				expect(worker.worker.terminate).toHaveBeenCalledOnce();
			});
		});
	});
});
