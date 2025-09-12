import type {
	AllowSigningResponse,
	CreateChallengeResponse
} from '$declarations/backend/backend.did';
import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import { PowProtectionScheduler } from '$icp/schedulers/pow-protection.scheduler';
import * as powProtectorServices from '$icp/services/pow-protector.services';
import * as authClientApi from '$lib/api/auth-client.api';
import * as backendApi from '$lib/api/backend.api';
import {
	ChallengeCompletionErrorEnum,
	CreateChallengeEnum,
	PowChallengeError,
	PowCreateChallengeError
} from '$lib/canisters/backend.errors';
import { POW_CHALLENGE_INTERVAL_MILLIS } from '$lib/constants/pow.constants';
import type { PostMessageDataRequest } from '$lib/types/post-message';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { TestUtil } from '$tests/types/utils';
import type { MockInstance } from 'vitest';

describe('pow-protector.worker', () => {
	let spyCreatePowChallenge: MockInstance;
	let spyAllowSigning: MockInstance;
	let spySolvePowChallenge: MockInstance;
	let spyHasRequiredCycles: MockInstance;
	let _spyAllowance: MockInstance;

	let originalPostmessage: unknown;

	// Mock for CreateChallengeResponse
	const mockCreateChallengeResponse: CreateChallengeResponse = {
		difficulty: 1,
		start_timestamp_ms: 1234567890n,
		expiry_timestamp_ms: 1234568890n
	};

	const mockAllowSigningResponse: AllowSigningResponse = {
		status: { Executed: null },
		challenge_completion: [
			{
				solved_duration_ms: 1500n,
				next_allowance_ms: 3600000n,
				next_difficulty: 2,
				current_difficulty: 1
			}
		],
		allowed_cycles: 100000000n
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
		msg: 'syncPowProtectionStatus',
		data: {
			state: 'error'
		}
	};

	const postMessageMock = vi.fn();

	// We don't await the job execution promise in the scheduler's function, so we need to advance the timers to verify the correct execution of the job
	const awaitJobExecution = () => vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS - 100);

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.spyOn(authClientApi, 'loadIdentity').mockResolvedValue(mockIdentity);

		// Mock the allowance API call that hasRequiredCycles depends on
		_spyAllowance = vi.spyOn(icrcLedgerApi, 'allowance').mockResolvedValue({
			allowance: 0n,
			expires_at: []
		}); // Return insufficient allowance by default

		// Reset all spies to their default successful behavior
		// Mock the API canister calls
		spyCreatePowChallenge = vi
			.spyOn(backendApi, 'createPowChallenge')
			.mockResolvedValue(mockCreateChallengeResponse);
		spyAllowSigning = vi
			.spyOn(backendApi, 'allowSigning')
			.mockResolvedValue(mockAllowSigningResponse);

		// Setup spy on the solvePowChallenge function
		spySolvePowChallenge = vi
			.spyOn(powProtectorServices, 'solvePowChallenge')
			.mockResolvedValue(42n);

		// Mock hasRequiredCycles to return false so the scheduler logic is executed
		spyHasRequiredCycles = vi
			.spyOn(powProtectorServices, 'hasRequiredCycles')
			.mockResolvedValue(false);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostmessage;
	});

	const initWithSuccess = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: PowProtectionScheduler;

		return {
			setup: () => {
				// Initialize the scheduler here
				scheduler = new PowProtectionScheduler();
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				it('should start the scheduler with an interval', async () => {
					await scheduler.start(startData);

					expect(scheduler['timer']['timer']).toBeDefined();
				});

				it('should trigger the scheduler manually', async () => {
					await scheduler.trigger(startData);

					expect(spyHasRequiredCycles).toHaveBeenCalledOnce();
					expect(spyCreatePowChallenge).toHaveBeenCalledOnce();
					expect(spyCreatePowChallenge).toHaveBeenCalledWith({ identity: mockIdentity });

					expect(spySolvePowChallenge).toHaveBeenCalledOnce();
					expect(spySolvePowChallenge).toHaveBeenCalledWith({
						timestamp: mockCreateChallengeResponse.start_timestamp_ms,
						difficulty: mockCreateChallengeResponse.difficulty
					});

					expect(spyAllowSigning).toHaveBeenCalledOnce();
					expect(spyAllowSigning).toHaveBeenCalledWith({
						identity: mockIdentity,
						request: { nonce: 42n }
					});
				});

				it('should stop the scheduler', () => {
					scheduler.stop();

					expect(scheduler['timer']['timer']).toBeUndefined();
				});

				it('should trigger pow protection periodically', async () => {
					await scheduler.start(startData);

					// Wait for initial execution to complete
					await vi.advanceTimersByTimeAsync(100);

					// After start() - should have run once immediately
					expect(spyCreatePowChallenge).toHaveBeenCalledOnce();
					expect(spyCreatePowChallenge).toHaveBeenCalledWith({ identity: mockIdentity });

					expect(spySolvePowChallenge).toHaveBeenCalledOnce();
					expect(spySolvePowChallenge).toHaveBeenCalledWith({
						timestamp: mockCreateChallengeResponse.start_timestamp_ms,
						difficulty: mockCreateChallengeResponse.difficulty
					});

					expect(spyAllowSigning).toHaveBeenCalledOnce();
					expect(spyAllowSigning).toHaveBeenCalledWith({
						identity: mockIdentity,
						request: { nonce: 42n }
					});

					// Advance timer to trigger the first interval execution
					await vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS);

					// After first interval - should have run twice total
					expect(spyCreatePowChallenge).toHaveBeenCalledTimes(2);
					expect(spySolvePowChallenge).toHaveBeenCalledTimes(2);
					expect(spyAllowSigning).toHaveBeenCalledTimes(2);

					// Advance timer to trigger the second interval execution
					await vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS);

					// After second interval - should have run three times total
					expect(spyCreatePowChallenge).toHaveBeenCalledTimes(3);
					expect(spySolvePowChallenge).toHaveBeenCalledTimes(3);
					expect(spyAllowSigning).toHaveBeenCalledTimes(3);
				});

				it('should post messages for status updates', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					// For each execution cycle, we expect:
					// 1. 'syncPowProtectionStatus' with state 'in_progress' from SchedulerTimer
					// 2. 'syncPowProgress' with progress 'REQUEST_CHALLENGE'
					// 3. 'syncPowProgress' with progress 'SOLVE_CHALLENGE'
					// 4. 'syncPowProgress' with progress 'GRANT_CYCLES'
					// 5. 'syncPowNextAllowance' with nextAllowanceMs value
					// 6. 'syncPowProtectionStatus' with state 'idle' from SchedulerTimer

					// Verify the first round of messages
					expect(postMessageMock).toHaveBeenCalledTimes(6);

					// First two calls should be status updates
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);

					// Reset mock to simplify subsequent tests
					postMessageMock.mockClear();

					// Advance timer to trigger next cycle
					await vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS);

					// Second round of messages should have same pattern
					expect(postMessageMock).toHaveBeenCalledTimes(6);
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);

					postMessageMock.mockClear();

					// Advance timer to trigger third cycle
					await vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS);

					// Third round of messages should have same pattern
					expect(postMessageMock).toHaveBeenCalledTimes(6);
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);
				});
			}
		};
	};

	const initWithChallengeInProgressError = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: PowProtectionScheduler;

		return {
			setup: () => {
				scheduler = new PowProtectionScheduler();
				// Ensure hasRequiredCycles returns false so the PoW logic runs
				spyHasRequiredCycles.mockResolvedValue(false);
				// Create a ChallengeInProgressError and mock createPowChallenge to reject with it
				const err = new PowCreateChallengeError(
					'Challenge is in progress',
					CreateChallengeEnum.ChallengeInProgress
				);
				spyCreatePowChallenge.mockRejectedValue(err);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				it('should handle ChallengeInProgressError gracefully', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					// For ChallengeInProgressError, we just start and end normally
					// because the error is handled internally without propagating
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);

					// Make sure error status was not set
					const errorCalls = postMessageMock.mock.calls.filter(
						(call) => call[0].data?.state === 'error'
					);

					expect(errorCalls).toHaveLength(0);
				});
			}
		};
	};

	const initWithExpiredChallengeError = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: PowProtectionScheduler;

		return {
			setup: () => {
				scheduler = new PowProtectionScheduler();
				// Ensure hasRequiredCycles returns false so the PoW logic runs
				spyHasRequiredCycles.mockResolvedValue(false);
				// For ExpiredChallengeError, we need to make allowSigning fail with the right error
				spyCreatePowChallenge.mockResolvedValue(mockCreateChallengeResponse);
				const err = new PowChallengeError(
					'Challenge expired',
					ChallengeCompletionErrorEnum.ExpiredChallenge
				);
				spyAllowSigning.mockRejectedValue(err);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				it('should not handle ExpiredChallengeError gracefully', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					// With ExpiredChallengeError, we should see the error status
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusError);

					// Make sure error status was set
					const errorCalls = postMessageMock.mock.calls.filter(
						(call) => call[0].data?.state === 'error'
					);

					expect(errorCalls).toHaveLength(1);
				});
			}
		};
	};

	const initWithUnhandledError = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: PowProtectionScheduler;

		return {
			setup: () => {
				scheduler = new PowProtectionScheduler();
				// Ensure hasRequiredCycles returns false so the PoW logic runs
				spyHasRequiredCycles.mockResolvedValue(false);
				// Use a general error that isn't specially handled
				const err = new Error('Unhandled error');
				spyCreatePowChallenge.mockRejectedValue(err);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				it('should set error status for unhandled errors', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					// For unhandled errors, we should see the error status
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusError);
				});
			}
		};
	};

	const initWithSufficientCycles = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: PowProtectionScheduler;

		return {
			setup: () => {
				scheduler = new PowProtectionScheduler();
				// Mock hasRequiredCycles to return true to trigger early return
				spyHasRequiredCycles.mockResolvedValue(true);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				it('should skip PoW when user has sufficient cycles', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					// Should only see status messages, no progress messages
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);

					// Should not call PoW-related functions
					expect(spyCreatePowChallenge).not.toHaveBeenCalled();
					expect(spySolvePowChallenge).not.toHaveBeenCalled();
					expect(spyAllowSigning).not.toHaveBeenCalled();

					// Should not see any progress messages
					const progressCalls = postMessageMock.mock.calls.filter(
						(call) => call[0].msg === 'syncPowProgress'
					);

					expect(progressCalls).toHaveLength(0);
				});
			}
		};
	};

	describe('with successful execution', () => {
		const { setup, teardown, tests } = initWithSuccess({});

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});

	describe('with ChallengeInProgressError', () => {
		const { setup, teardown, tests } = initWithChallengeInProgressError({});

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});

	describe('with ExpiredChallengeError', () => {
		const { setup, teardown, tests } = initWithExpiredChallengeError({});

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});

	describe('with unhandled error', () => {
		const { setup, teardown, tests } = initWithUnhandledError({});

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});

	describe('with sufficient cycles', () => {
		const { setup, teardown, tests } = initWithSufficientCycles({});

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});
});
