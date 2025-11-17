import { AppWorker } from '$lib/services/_worker.services';
import { idleSignOut } from '$lib/services/auth.services';
import { AuthWorker } from '$lib/services/worker.auth.services';
import { authRemainingTimeStore, type AuthStoreData } from '$lib/stores/auth.store';
import type { PostMessageDataResponseAuth } from '$lib/types/post-message';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

vi.mock('$lib/services/auth.services', () => ({
	idleSignOut: vi.fn()
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

const mockId = 'abcdefgh';

vi.stubGlobal('crypto', {
	randomUUID: vi.fn().mockReturnValue(mockId)
});

describe('worker.auth.services', () => {
	describe('AuthWorker', () => {
		let worker: AuthWorker;

		const mockData: { auth: AuthStoreData; locked?: boolean } = {
			auth: { identity: mockIdentity }
		};

		beforeEach(async () => {
			vi.clearAllMocks();

			worker = await AuthWorker.init();
		});

		it('should initialize a worker instance', () => {
			expect(worker).toBeInstanceOf(AppWorker);
		});

		it('should start the worker and send the correct start message', () => {
			worker.syncAuthIdle(mockData);

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'startIdleTimer',
				workerId: mockId
			});
		});

		it('should stop the worker and send the correct stop message if the identity is nullish', () => {
			worker.syncAuthIdle({ ...mockData, auth: { identity: null } });

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'stopIdleTimer',
				workerId: mockId
			});
		});

		it('should stop the worker and send the correct stop message if it is in locked state', () => {
			worker.syncAuthIdle({ ...mockData, locked: true });

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'stopIdleTimer',
				workerId: mockId
			});
		});

		describe('onmessage', () => {
			it('should handle signOutIdleTimer message', () => {
				const payload = { msg: 'signOutIdleTimer' };
				workerInstance.onmessage?.({ data: payload } as MessageEvent);

				expect(idleSignOut).toHaveBeenCalledExactlyOnceWith();
			});

			it('should handle delegationRemainingTime message', () => {
				authRemainingTimeStore.set(undefined);

				expect(get(authRemainingTimeStore)).toBe(undefined);

				const mockData: PostMessageDataResponseAuth = {
					authRemainingTime: 123_456
				};
				const payload = { msg: 'delegationRemainingTime', data: mockData };
				workerInstance.onmessage?.({ data: payload } as MessageEvent);

				expect(get(authRemainingTimeStore)).toBe(123_456);

				workerInstance.onmessage?.({ data: { msg: 'delegationRemainingTime' } } as MessageEvent);

				expect(get(authRemainingTimeStore)).toBe(undefined);
			});
		});
	});
});
