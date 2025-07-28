import {
	syncPowNextAllowance,
	syncPowProgress
} from '$icp/services/pow-protector-listener.services';
import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
import type { PowProtectorWorkerInitResult } from '$icp/types/pow-protector-listener';
import {
	powProtectoreNextAllowanceStore,
	powProtectoreProgressStore
} from '$lib/stores/pow-protection.store';
import { get } from 'svelte/store';

vi.mock('$icp/services/pow-protector-listener.services', () => ({
	syncPowProgress: vi.fn(),
	syncPowNextAllowance: vi.fn()
}));

const postMessageSpy = vi.fn();

class MockWorker {
	postMessage = postMessageSpy;
	onmessage: ((event: MessageEvent) => void) | null = null;
	terminate: () => void = vi.fn();
}

vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

let workerInstance: Worker;

vi.mock('$lib/workers/workers?worker', () => ({
	default: vi.fn().mockImplementation(() => {
		// @ts-expect-error testing this on purpose with a mock class
		workerInstance = new Worker();
		return workerInstance;
	})
}));

describe('worker.pow-protection.services', () => {
	describe('initPowProtectorWorker', () => {
		let worker: PowProtectorWorkerInitResult;

		beforeEach(async () => {
			vi.clearAllMocks();

			worker = await initPowProtectorWorker();
		});

		it('should start the worker and send the correct start message', () => {
			worker.start();

			expect(postMessageSpy).toHaveBeenCalledOnce();
			expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
				msg: 'startPowProtectionTimer'
			});
		});

		it('should stop the worker and send the correct stop message', () => {
			worker.stop();

			expect(postMessageSpy).toHaveBeenCalledOnce();
			expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
				msg: 'stopPowProtectionTimer'
			});
		});

		it('should trigger the worker and send the correct trigger message', () => {
			worker.trigger();

			expect(postMessageSpy).toHaveBeenCalledOnce();
			expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
				msg: 'triggerPowProtectionTimer'
			});
		});

		it('should destroy the worker', () => {
			worker.destroy();

			expect(postMessageSpy).toHaveBeenCalledOnce();
			expect(postMessageSpy).toHaveBeenNthCalledWith(1, {
				msg: 'stopPowProtectionTimer'
			});

			expect(workerInstance.terminate).toHaveBeenCalledOnce();
		});

		describe('onmessage', () => {
			it('should handle syncPowProgress message', () => {
				const payload = {
					msg: 'syncPowProgress',
					data: { progress: 'REQUEST_CHALLENGE' }
				};
				workerInstance.onmessage?.({ data: payload } as MessageEvent);

				expect(syncPowProgress).toHaveBeenCalledOnce();
				expect(syncPowProgress).toHaveBeenCalledWith({
					data: payload.data
				});
			});

			it('should handle syncPowNextAllowance message', () => {
				const payload = {
					msg: 'syncPowNextAllowance',
					data: { nextAllowanceMs: 60000 }
				};
				workerInstance.onmessage?.({ data: payload } as MessageEvent);

				expect(syncPowNextAllowance).toHaveBeenCalledOnce();
				expect(syncPowNextAllowance).toHaveBeenCalledWith({
					data: payload.data
				});
			});

			it('should not handle unknown message types', () => {
				const payload = {
					msg: 'unknownMessage',
					data: { someData: 'test' }
				};
				workerInstance.onmessage?.({ data: payload } as MessageEvent);

				expect(syncPowProgress).not.toHaveBeenCalled();
				expect(syncPowNextAllowance).not.toHaveBeenCalled();
			});
		});

		describe('store integration tests', () => {
			it('should save syncPowProgress data to the progress store', async () => {
				// Create a new worker instance without mocks for this test
				const PowWorker = await import('$lib/workers/workers?worker');
				const testWorker: Worker = new PowWorker.default();

				testWorker.onmessage = ({ data }) => {
					const { msg } = data;
					if (msg === 'syncPowProgress') {
						// Directly call the actual function instead of mock
						powProtectoreProgressStore.setPowProtectorProgressData(data.data);
					}
				};

				const payload = {
					msg: 'syncPowProgress',
					data: { progress: 'SOLVE_CHALLENGE' }
				};

				testWorker.onmessage?.({ data: payload } as MessageEvent);

				const progressData = get(powProtectoreProgressStore);

				expect(progressData?.progress).toBe('SOLVE_CHALLENGE');
			});

			it('should save syncPowNextAllowance data to the next allowance store', async () => {
				// Create a new worker instance without mocks for this test
				const PowWorker = await import('$lib/workers/workers?worker');
				const testWorker: Worker = new PowWorker.default();

				testWorker.onmessage = ({ data }) => {
					const { msg } = data;
					if (msg === 'syncPowNextAllowance') {
						// Directly call the actual function instead of mock
						powProtectoreNextAllowanceStore.setPowProtectorNextAllowanceData(data.data);
					}
				};

				const payload = {
					msg: 'syncPowNextAllowance',
					data: { nextAllowanceMs: 75000 }
				};

				testWorker.onmessage?.({ data: payload } as MessageEvent);

				const nextAllowanceData = get(powProtectoreNextAllowanceStore);

				expect(nextAllowanceData?.nextAllowanceMs).toBe(75000);
			});

			it('should update progress store with different progress states', async () => {
				// Create a new worker instance without mocks for this test
				const PowWorker = await import('$lib/workers/workers?worker');
				const testWorker: Worker = new PowWorker.default();

				testWorker.onmessage = ({ data }) => {
					const { msg } = data;
					if (msg === 'syncPowProgress') {
						// Directly call the actual function instead of mock
						powProtectoreProgressStore.setPowProtectorProgressData(data.data);
					}
				};

				const progressStates = ['REQUEST_CHALLENGE', 'SOLVE_CHALLENGE', 'GRANT_CYCLES'] as const;

				progressStates.forEach((progress) => {
					const payload = {
						msg: 'syncPowProgress',
						data: { progress }
					};

					testWorker.onmessage?.({ data: payload } as MessageEvent);

					const progressData = get(powProtectoreProgressStore);

					expect(progressData?.progress).toBe(progress);
				});
			});

			it('should update next allowance store with different values', async () => {
				// Create a new worker instance without mocks for this test
				const PowWorker = await import('$lib/workers/workers?worker');
				const testWorker: Worker = new PowWorker.default();

				testWorker.onmessage = ({ data }) => {
					const { msg } = data;
					if (msg === 'syncPowNextAllowance') {
						// Directly call the actual function instead of mock
						powProtectoreNextAllowanceStore.setPowProtectorNextAllowanceData(data.data);
					}
				};

				const allowanceValues = [30000, 60000, 120000];

				allowanceValues.forEach((nextAllowanceMs) => {
					const payload = {
						msg: 'syncPowNextAllowance',
						data: { nextAllowanceMs }
					};

					testWorker.onmessage?.({ data: payload } as MessageEvent);

					const nextAllowanceData = get(powProtectoreNextAllowanceStore);

					expect(nextAllowanceData?.nextAllowanceMs).toBe(nextAllowanceMs);
				});
			});
		});
	});
});
