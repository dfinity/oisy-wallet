import type { TransferResponse } from '$declarations/ext_v2_token/ext_v2_token.did';
import {
	mapExtV2TokenCommonError,
	mapExtV2TokenTransferError
} from '$icp/canisters/ext-v2-token.errors';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';

describe('ext-v2-token.errors', () => {
	describe('mapExtV2TokenCommonError', () => {
		it('should map InvalidToken error', () => {
			const result = mapExtV2TokenCommonError({ InvalidToken: 'abc' });

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toContain('invalid');
			expect(result.message).toContain('abc');
		});

		it('should map Other error', () => {
			const result = mapExtV2TokenCommonError({ Other: 'something went wrong' });

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toBe('something went wrong');
		});

		it('should return unknown error for unrecognized variant', () => {
			const result = mapExtV2TokenCommonError({} as never);

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toContain('Unknown');
		});
	});

	describe('mapExtV2TokenTransferError', () => {
		it('should return error when response has no err property', () => {
			const response: TransferResponse = {
				ok: ZERO
			};

			const result = mapExtV2TokenTransferError(response);

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toContain('No error in TransferResponse');
		});

		it('should map CannotNotify error', () => {
			const response: TransferResponse = {
				err: { CannotNotify: 'account-id' }
			};

			const result = mapExtV2TokenTransferError(response);

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toContain('Cannot notify');
		});

		it('should map InsufficientBalance error', () => {
			const response: TransferResponse = {
				err: { InsufficientBalance: null }
			};

			const result = mapExtV2TokenTransferError(response);

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toContain('Insufficient balance');
		});

		it('should map Rejected error', () => {
			const response: TransferResponse = {
				err: { Rejected: null }
			};

			const result = mapExtV2TokenTransferError(response);

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toContain('rejected');
		});

		it('should map Unauthorized error', () => {
			const response: TransferResponse = {
				err: { Unauthorized: 'bad-account' }
			};

			const result = mapExtV2TokenTransferError(response);

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toContain('Unauthorized');
		});

		it('should delegate to mapExtV2TokenCommonError for other errors', () => {
			const response: TransferResponse = {
				err: { Other: 'custom error' }
			};

			const result = mapExtV2TokenTransferError(response);

			expect(result).toBeInstanceOf(CanisterInternalError);
			expect(result.message).toBe('custom error');
		});
	});
});
