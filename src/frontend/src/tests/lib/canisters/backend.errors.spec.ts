import {
	mapAllowSigningError,
	mapBtcPendingTransactionError,
	mapBtcSelectUserUtxosFeeError,
	mapGetAllowedCyclesError
} from '$lib/canisters/backend.errors';
import { CanisterInternalError } from '$lib/canisters/errors';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { ApproveError } from '@icp-sdk/canisters/ledger/icp';

describe('backend.errors', () => {
	describe('mapBtcPendingTransactionError', () => {
		it('should map InternalError', () => {
			const err = mapBtcPendingTransactionError({
				InternalError: { msg: 'pending tx error' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('pending tx error');
		});

		it('should map InvalidUtxos', () => {
			const err = mapBtcPendingTransactionError({
				InvalidUtxos: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('The provided UTXOs are invalid.');
		});

		it('should map EmptyUtxos', () => {
			const err = mapBtcPendingTransactionError({
				EmptyUtxos: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('No UTXOs provided.');
		});

		it('should map DuplicateUtxos', () => {
			const err = mapBtcPendingTransactionError({
				DuplicateUtxos: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Duplicate UTXOs provided.');
		});

		it('should map UtxosAlreadyReserved', () => {
			const err = mapBtcPendingTransactionError({
				UtxosAlreadyReserved: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Some of the provided UTXOs are already reserved.');
		});

		it('should map RateLimited', () => {
			const err = mapBtcPendingTransactionError({
				RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Rate limit exceeded. Maximum of 5 calls allowed every 60 seconds.');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapBtcPendingTransactionError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown BtcPendingTransactionError');
		});
	});

	describe('mapBtcSelectUserUtxosFeeError', () => {
		it('should map InternalError', () => {
			const err = mapBtcSelectUserUtxosFeeError({
				InternalError: { msg: 'utxos fee error' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('utxos fee error');
		});

		it('should map PendingTransactions', () => {
			const err = mapBtcSelectUserUtxosFeeError({
				PendingTransactions: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Selecting utxos fee is not possible - pending transactions found.');
		});

		it('should map RateLimited', () => {
			const err = mapBtcSelectUserUtxosFeeError({
				RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Rate limit exceeded. Maximum of 5 calls allowed every 60 seconds.');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapBtcSelectUserUtxosFeeError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown BtcSelectUserUtxosFeeError');
		});
	});

	describe('mapGetAllowedCyclesError', () => {
		it('should map FailedToContactCyclesLedger', () => {
			const err = mapGetAllowedCyclesError({
				FailedToContactCyclesLedger: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('The Cycles Ledger cannot be contacted.');
		});

		it('should map Other', () => {
			const err = mapGetAllowedCyclesError({
				Other: 'custom error message'
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('custom error message');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapGetAllowedCyclesError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown GetAllowedCyclesError');
		});
	});

	describe('mapAllowSigningError', () => {
		it('should map ApproveError', () => {
			const err = mapAllowSigningError({
				ApproveError: { GenericError: { error_code: 1n, message: 'approve failed' } }
			});

			expect(err).toBeInstanceOf(ApproveError);
			expect(err.message).toBe('approve failed');
		});

		it('should map FailedToContactCyclesLedger', () => {
			const err = mapAllowSigningError({
				FailedToContactCyclesLedger: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('The Cycles Ledger cannot be contacted.');
		});

		it('should map RateLimited', () => {
			const err = mapAllowSigningError({
				RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Rate limit exceeded. Maximum of 5 calls allowed every 60 seconds.');
		});

		it('should map RateLimitedByGuard', () => {
			const err = mapAllowSigningError({
				RateLimitedByGuard: { max_calls: 10, window_ns: 60_000_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe(
				'Guard rate limit exceeded. Maximum of 10 calls allowed every 60000 seconds.'
			);
		});

		it('should map Other', () => {
			const err = mapAllowSigningError({
				Other: 'some other error'
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('some other error');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapAllowSigningError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown AllowSigningError');
		});
	});
});
