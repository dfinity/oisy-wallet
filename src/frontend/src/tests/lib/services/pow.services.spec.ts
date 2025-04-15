import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AllowSigningStatus } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { _allowSigning, _createPowChallenge, solvePowChallenge } from '$lib/services/pow.services';
import type { AllowSigningResult } from '$lib/types/api';
import * as cryptoUtils from '$lib/utils/crypto.utils';

describe('pow.services', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('solvePowChallenge', () => {
		beforeEach(() => {
			vi.spyOn(cryptoUtils, 'hashToHex').mockImplementation((input: string) => {
				// Simplified predictable hashing for testing
				if (input === '1000.0') {
					return Promise.resolve('0000000aabcdef12');
				}
				if (input.startsWith('1000.')) {
					return Promise.resolve('ffffffffabcdef12');
				}
				return Promise.resolve('ffffffffabcdef12');
			});
		});

		test('successful solving of PoW challenge', async () => {
			const timestamp = BigInt(1000);
			const difficulty = 1; // highest difficulty for quick test
			const nonce = await solvePowChallenge({ timestamp, difficulty });
			expect(nonce).toBe(0); // first nonce instantly solves due to mocked hash
		});

		test('throws error for invalid difficulty', async () => {
			await expect(
				solvePowChallenge({
					timestamp: BigInt(1000),
					difficulty: 0
				})
			).rejects.toThrow('Difficulty must be greater than zero');
		});
	});

	describe('_createPowChallenge', () => {
		test('returns successful result', async () => {
			const mockResult = {
				Ok: { difficulty: 1000, start_timestamp_ms: 1234n, expiry_timestamp_ms: 5678n }
			};
			vi.spyOn(backendApi, 'createPowChallenge').mockResolvedValue(mockResult);

			const result = await _createPowChallenge({ identity: undefined });
			expect(result).toEqual(mockResult);
		});

		test('handles thrown exception gracefully', async () => {
			vi.spyOn(backendApi, 'createPowChallenge').mockRejectedValue(
				new Error('Failure in API call')
			);

			const result = await _createPowChallenge({ identity: undefined });
			expect(result).toEqual({
				Err: { Other: expect.stringContaining('UnexpectedError: Error: Failure in API call') }
			});
		});
	});

	describe('_allowSigning', () => {
		test('returns successful allow-signing result', async () => {
			const mockResult: AllowSigningResult = {
				Ok: {
					status: 'Executed' as unknown as AllowSigningStatus,
					challenge_completion: [
						{
							next_allowance_ms: 1000n,
							solved_duration_ms: 500n,
							current_difficulty: 100000,
							next_difficulty: 1000000
						}
					],

					allowed_cycles: BigInt(1000000)
				}
			};

			vi.spyOn(backendApi, 'allowSigningResult').mockResolvedValue(mockResult);

			const result = await _allowSigning({ identity: undefined });
			expect(result).toEqual(mockResult);
		});

		test('handles allow-signing thrown exception gracefully', async () => {
			vi.spyOn(backendApi, 'allowSigningResult').mockRejectedValue(
				new Error('API failure during allow signing')
			);

			const result = await _allowSigning({ identity: undefined });
			expect(result).toEqual({
				Err: {
					Other: expect.stringContaining('UnexpectedError: Error: API failure during allow signing')
				}
			});
		});
	});
});
