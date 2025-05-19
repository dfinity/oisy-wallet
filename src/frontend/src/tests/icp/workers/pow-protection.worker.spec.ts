import type {
	AllowSigningResponse,
	CreateChallengeResponse
} from '$declarations/backend/backend.did';
import { PowProtectionScheduler } from '$icp/schedulers/pow-protection.scheduler';
import * as powProtectorServices from '$icp/services/pow-protector.services';
import * as backendApi from '$lib/api/backend.api';
import {
	ChallengeCompletionErrorEnum,
	CreateChallengeEnum,
	PowChallengeError,
	PowCreateChallengeError
} from '$lib/canisters/backend.errors';
import { POW_CHALLENGE_INTERVAL_MILLIS } from '$lib/constants/pow.constants';
import type { PostMessageDataRequest } from '$lib/types/post-message';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { TestUtil } from '$tests/types/utils';
import type { MockInstance } from 'vitest';

describe('pow-protector.worker', () => {
	let spyCreatePowChallenge: MockInstance;
	let spyAllowSigning: MockInstance;
	let spySolvePowChallenge: MockInstance;

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

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

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

					expect(spyCreatePowChallenge).toHaveBeenCalledTimes(1);
					expect(spyCreatePowChallenge).toHaveBeenCalledWith({ identity: mockIdentity });

					expect(spySolvePowChallenge).toHaveBeenCalledTimes(1);
					expect(spySolvePowChallenge).toHaveBeenCalledWith({
						timestamp: mockCreateChallengeResponse.start_timestamp_ms,
						difficulty: mockCreateChallengeResponse.difficulty
					});

					expect(spyAllowSigning).toHaveBeenCalledTimes(1);
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

					expect(spyCreatePowChallenge).toHaveBeenCalledTimes(1);
					expect(spyCreatePowChallenge).toHaveBeenCalledWith({ identity: mockIdentity });

					expect(spySolvePowChallenge).toHaveBeenCalledTimes(1);
					expect(spySolvePowChallenge).toHaveBeenCalledWith({
						timestamp: mockCreateChallengeResponse.start_timestamp_ms,
						difficulty: mockCreateChallengeResponse.difficulty
					});

					expect(spyAllowSigning).toHaveBeenCalledTimes(1);
					expect(spyAllowSigning).toHaveBeenCalledWith({
						identity: mockIdentity,
						request: { nonce: 42n }
					});

					await vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS);

					expect(spyCreatePowChallenge).toHaveBeenCalledTimes(2);
					expect(spySolvePowChallenge).toHaveBeenCalledTimes(2);
					expect(spyAllowSigning).toHaveBeenCalledTimes(2);

					await vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS);

					expect(spyCreatePowChallenge).toHaveBeenCalledTimes(3);
					expect(spySolvePowChallenge).toHaveBeenCalledTimes(3);
					expect(spyAllowSigning).toHaveBeenCalledTimes(3);
				});

				it('should post messages for status updates', async () => {
					await scheduler.start(startData);

					expect(postMessageMock).toHaveBeenCalledTimes(2);
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(2, mockPostMessageStatusIdle);

					await vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(4);
					expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);

					await vi.advanceTimersByTimeAsync(POW_CHALLENGE_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(6);
					expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusInProgress);
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

					// Even with ExpiredChallengeError, we should complete normally
					// because the error is caught and handled internally
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);

					// Make sure error status was not set
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

					// For unhandled errors, we should see the error status
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusError);
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
});
