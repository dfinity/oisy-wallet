import { PowProtectionScheduler } from '$icp/schedulers/pow-protection.scheduler';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as backendApi from '$lib/api/backend.api';
import type { TestUtil } from '$tests/types/utils';

// Mock data
const mockPowChallengeResponse = {
	start_timestamp_ms: 1234567890123n,
	difficulty: 10,
	expiry_timestamp_ms: 1234567891123n
};

// Fix: Make challenge_completion a proper union type ([] | [ChallengeCompletion])
const mockAllowSigningResponse = {
	status: { Executed: null },
	challenge_completion: [
		{
			solved_duration_ms: 123n,
			next_allowance_ms: 456n,
			next_difficulty: 11,
			current_difficulty: 10
		}
	] as [{
		solved_duration_ms: bigint;
		next_allowance_ms: bigint;
		next_difficulty: number;
		current_difficulty: number;
	}],
	allowed_cycles: 100n
};

const mockPostMessageStatusInProgress = {
	msg: 'syncPowProtectionStatus',
	data: {
		state: 'in_progress'
	}
};

const mockPostMessageStatusIdle = {
	msg: 'syncPowProtectionStatus',
	data: {
		state: 'idle'
	}
};

const mockPostMessageStatusError = {
	msg: 'syncPowProtectionStatusError',
	data: { error: new Error('API Error') }
};

const mockNonceValue = 12345n;

describe('PowProtectionScheduler', () => {
	let scheduler: PowProtectionScheduler;
	const postMessageMock = vi.fn();

	beforeAll(() => {
		// Mock the global postMessage function
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		// Mock identity resolution
		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

		// Mock backend API calls
		vi.spyOn(backendApi, 'createPowChallenge').mockResolvedValue(mockPowChallengeResponse);
		vi.spyOn(backendApi, 'allowSigning').mockResolvedValue(mockAllowSigningResponse);
	});

	afterEach(() => {
		vi.useRealTimers();
		if (scheduler) {
			scheduler.stop();
		}
	});

	afterAll(() => {
		// Restore the global postMessage
		vi.restoreAllMocks();
	});

	const initTests = (): TestUtil => ({
		setup: () => {
			scheduler = new PowProtectionScheduler();
			// Override the private method by using prototype and function assignment
			// This is a workaround since we can't directly spy on private methods
			scheduler['solvePowChallenge'] = async () => mockNonceValue;
		},
		teardown: () => {
			scheduler.stop();
		},
		tests: () => {
			it('should start the scheduler and execute periodic job', async () => {
				await scheduler.start(undefined);

				expect(scheduler['timer']['timer']).toBeDefined();
				expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);

				// First execution
				await vi.advanceTimersByTimeAsync(5000);
				expect(backendApi.createPowChallenge).toHaveBeenCalledTimes(1);
				expect(backendApi.allowSigning).toHaveBeenCalledTimes(1);

				// Reset mocks to ensure we can track the next execution clearly
				vi.clearAllMocks();

				// Second execution
				await vi.advanceTimersByTimeAsync(5000);
				expect(backendApi.createPowChallenge).toHaveBeenCalledTimes(1);
				expect(backendApi.allowSigning).toHaveBeenCalledTimes(1);
			});

			it('should manually trigger the scheduler job', async () => {
				await scheduler.trigger(undefined);

				expect(backendApi.createPowChallenge).toHaveBeenCalledTimes(1);
				expect(backendApi.createPowChallenge).toHaveBeenCalledWith({ identity: mockIdentity });
				expect(backendApi.allowSigning).toHaveBeenCalledTimes(1);
				expect(backendApi.allowSigning).toHaveBeenCalledWith({
					identity: mockIdentity,
					request: { nonce: mockNonceValue }
				});
			});

			it('should stop the scheduler and clear the timer', () => {
				scheduler.stop();

				expect(scheduler['timer']['timer']).toBeUndefined();
				expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
			});

			it('should post status updates during job execution', async () => {
				await scheduler.start(undefined);

				expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);

				scheduler.stop();

				expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
			});
		}
	});

	const initErrorTests = (): TestUtil => ({
		setup: () => {
			scheduler = new PowProtectionScheduler();
			// Override the private method
			scheduler['solvePowChallenge'] = async () => mockNonceValue;
		},
		teardown: () => {
			scheduler.stop();
		},
		tests: () => {
			it('should handle errors during execution gracefully', async () => {
				const error = new Error('API Error');
				vi.spyOn(backendApi, 'createPowChallenge').mockRejectedValueOnce(error);

				// Mock the timer's postMsg method to capture the error message correctly
				scheduler['timer']['postMsg'] = vi.fn();

				await scheduler.start(undefined);
				await vi.advanceTimersByTimeAsync(5000);

				// Verify the error message was posted correctly
				expect(scheduler['timer']['postMsg']).toHaveBeenCalledWith({
					msg: 'syncPowProtectionStatusError',
					data: { error }
				});
			});
		}
	});

	describe('Normal Scenarios', () => {
		const { setup, teardown, tests } = initTests();

		beforeEach(setup);
		afterEach(teardown);

		tests();
	});

	describe('Error Scenarios', () => {
		const { setup, teardown, tests } = initErrorTests();

		beforeEach(setup);
		afterEach(teardown);

		tests();
	});
});