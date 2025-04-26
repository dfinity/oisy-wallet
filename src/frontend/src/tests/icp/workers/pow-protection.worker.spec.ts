import type {
	AllowSigningResponse,
	CreateChallengeResponse
} from '$declarations/backend/backend.did';
import { POW_CHALLENGE_INTERVAL_MILLIS } from '$env/pow.env';
import { PowProtectionScheduler } from '$icp/schedulers/pow-protection.scheduler';
import * as powProtectorServices from '$icp/services/pow-protector.services';
import * as backendApi from '$lib/api/backend.api';
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

	const initWithErrors = ({
		startData = undefined,
		initErrorMock
	}: {
		startData?: PostMessageDataRequest | undefined;
		initErrorMock: (err: Error) => void;
		msg: 'syncPowProtection';
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
				it('should trigger postMessage with error state', async () => {
					const err = new Error('test');
					initErrorMock(err);

					await scheduler.start(startData);

					// The pattern is: first in_progress, then error state, then idle
					expect(postMessageMock).toHaveBeenCalledTimes(3);

					// Check the first call (in_progress)
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);

					// Check the second call (error state)
					expect(postMessageMock).toHaveBeenNthCalledWith(2, mockPostMessageStatusError);

					// Check the third call (idle)
					expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageStatusIdle);
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

	describe('with error in createPowChallenge', () => {
		const initErrorMock = (err: Error) => {
			spyCreatePowChallenge.mockRejectedValue(err);
		};

		const { setup, teardown, tests } = initWithErrors({
			initErrorMock,
			msg: 'syncPowProtection'
		});

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});

	describe('with error in allowSigning', () => {
		const initErrorMock = (err: Error) => {
			// Make createPowChallenge succeed but allowSigning fail
			spyCreatePowChallenge.mockResolvedValue(mockCreateChallengeResponse);
			spyAllowSigning.mockRejectedValue(err);
		};

		const { setup, teardown, tests } = initWithErrors({
			initErrorMock,
			msg: 'syncPowProtection'
		});

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});
});
