import { AppWorker } from '$lib/services/_worker.services';
import type { WorkerData } from '$lib/types/worker';

const postMessageSpy = vi.fn();

class MockWorker {
	postMessage = postMessageSpy;
	onmessage: ((event: MessageEvent) => void) | null = null;
	terminate: () => void = vi.fn();
}

let workerInstance: Worker;

vi.mock('$lib/workers/workers?worker', () => ({
	default: vi.fn().mockImplementation(() => {
		// @ts-expect-error testing this on purpose with a mock class
		workerInstance = new Worker();
		return workerInstance;
	})
}));

describe('_worker.services', () => {
	describe('AppWorker', () => {
		const listenerSpy = vi.fn();
		const stopTimerSpy = vi.fn();
		const destroyCallbackSpy = vi.fn();

		class TestWorker extends AppWorker {
			constructor(worker: WorkerData) {
				super(worker);
			}

			protected stopTimer(): void {
				stopTimerSpy();
			}

			protected override destroyCallback = destroyCallbackSpy;

			setListener = this.setOnMessage;

			sendMessage = this.postMessage;
		}

		const createTestWorker = async (): Promise<{ instance: TestWorker; worker: WorkerData }> => {
			const worker = await AppWorker.getInstance();
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

			expect(worker.worker.onmessage).toBe(listenerSpy);
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
		});
	});
});
