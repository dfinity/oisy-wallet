import { AppWorker } from '$lib/services/_worker.services';
import type { WorkerData } from '$lib/types/worker';

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

describe('_worker.services', () => {
	describe('AppWorker', () => {
		const listenerSpy = vi.fn();
		const stopTimerSpy = vi.fn();

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

		const createTestWorkerSingleton = async (): Promise<{
			instance: TestWorker;
			worker: WorkerData;
		}> => {
			const worker = await AppWorker.getInstance({ asSingleton: true });
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
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should initialise a worker instance and return WorkerData', async () => {
			const worker = await AppWorker.getInstance();

			expect(worker.worker).toBeInstanceOf(Worker);
			expect(worker.isSingleton).toBeFalsy();
		});

		it('should return different workers by default', async () => {
			const first = await AppWorker.getInstance();
			const second = await AppWorker.getInstance();

			expect(first.worker).not.toBe(second.worker);
			expect(first.isSingleton).toBeFalsy();
			expect(second.isSingleton).toBeFalsy();
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

		describe('as singleton', () => {
			const params = { asSingleton: true };

			it('should reuse the same worker', async () => {
				const first = await AppWorker.getInstance(params);
				const second = await AppWorker.getInstance(params);

				expect(first.worker).toBeInstanceOf(Worker);
				expect(second.worker).toBeInstanceOf(Worker);

				expect(first.worker).toBe(second.worker);

				expect(first.isSingleton).toBeTruthy();
				expect(second.isSingleton).toBeTruthy();
			});

			it("should add a listener to the worker's message event", async () => {
				const { instance, worker } = await createTestWorkerSingleton();

				instance.setListener(listenerSpy);

				expect(worker.worker.addEventListener).toHaveBeenCalledExactlyOnceWith(
					'message',
					listenerSpy
				);

				expect(worker.worker.onmessage).not.toStrictEqual(listenerSpy);
				expect(worker.worker.onmessage).toBeNull();
			});

			it("should remove the listener from the worker's message event on destroy", async () => {
				const { instance, worker } = await createTestWorkerSingleton();

				instance.setListener(listenerSpy);

				instance.destroy();

				expect(stopTimerSpy).toHaveBeenCalledExactlyOnceWith();

				expect(worker.worker.removeEventListener).toHaveBeenCalledExactlyOnceWith(
					'message',
					listenerSpy
				);

				expect(worker.worker.terminate).not.toHaveBeenCalled();
			});

			it('should not remove the listener twice on destroy', async () => {
				const { instance, worker } = await createTestWorkerSingleton();

				instance.setListener(listenerSpy);

				instance.destroy();

				instance.destroy();

				expect(worker.worker.removeEventListener).toHaveBeenCalledExactlyOnceWith(
					'message',
					listenerSpy
				);
			});
		});
	});
});
