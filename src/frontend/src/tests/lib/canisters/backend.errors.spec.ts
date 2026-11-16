import {
	mapAllowSigningError,
	mapBtcAddPendingTransactionError,
	mapBtcBroadcastTransactionError,
	mapBtcGetBalanceError,
	mapBtcGetFeePercentilesError,
	mapBtcGetPendingTransactionsError,
	mapBtcGetSpendableUtxosError,
	mapGetAllowedCyclesError,
	mapSignOnramperWidgetUrlError
} from '$lib/canisters/backend.errors';
import {
	BtcBroadcastTransactionCanisterError,
	CanisterInternalError,
	OnramperRateLimitedError,
	OnramperSecretNotConfiguredError
} from '$lib/canisters/errors';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { ApproveError } from '@icp-sdk/canisters/ledger/icp';

describe('backend.errors', () => {
	describe('mapBtcAddPendingTransactionError', () => {
		it('should map InternalError', () => {
			const err = mapBtcAddPendingTransactionError({
				InternalError: { msg: 'pending tx error' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('pending tx error');
		});

		it('should map InvalidUtxos', () => {
			const err = mapBtcAddPendingTransactionError({
				InvalidUtxos: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('The provided UTXOs are invalid.');
		});

		it('should map EmptyUtxos', () => {
			const err = mapBtcAddPendingTransactionError({
				EmptyUtxos: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('No UTXOs provided.');
		});

		it('should map DuplicateUtxos', () => {
			const err = mapBtcAddPendingTransactionError({
				DuplicateUtxos: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Duplicate UTXOs provided.');
		});

		it('should map UtxosAlreadyReserved', () => {
			const err = mapBtcAddPendingTransactionError({
				UtxosAlreadyReserved: null
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Some of the provided UTXOs are already reserved.');
		});

		it('should map RateLimited', () => {
			const err = mapBtcAddPendingTransactionError({
				RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Rate limit exceeded. Maximum of 5 calls allowed every 60 seconds.');
		});

		it('should map InvalidDelegationChain', () => {
			const err = mapBtcAddPendingTransactionError({
				InvalidDelegationChain: { msg: 'chain expired' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('II delegation chain verification failed: chain expired');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapBtcAddPendingTransactionError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown BtcAddPendingTransactionError');
		});
	});

	describe('mapBtcBroadcastTransactionError', () => {
		it.each([
			{
				variant: {
					RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal }
				},
				message: 'Rate limit exceeded. Maximum of 5 calls allowed every 60 seconds.'
			},
			{
				variant: { BroadcastOutcomeUnknown: { msg: 'trap' } },
				message: 'btc_broadcast_transaction: BroadcastOutcomeUnknown: trap'
			},
			{
				variant: { InvalidSignature: { index: 2 } },
				message: 'btc_broadcast_transaction: InvalidSignature (index 2)'
			},
			{ variant: { FeeTooLow: null }, message: 'btc_broadcast_transaction: FeeTooLow' }
		])('should keep the variant $variant and name it', ({ variant, message }) => {
			const err = mapBtcBroadcastTransactionError(variant);

			expect(err).toBeInstanceOf(BtcBroadcastTransactionCanisterError);
			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.variant).toBe(variant);
			expect(err.message).toBe(message);
		});
	});

	describe('mapBtcGetPendingTransactionsError', () => {
		it('should map InternalError', () => {
			const err = mapBtcGetPendingTransactionsError({
				InternalError: { msg: 'pending tx error' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('pending tx error');
		});

		it('should map RateLimited', () => {
			const err = mapBtcGetPendingTransactionsError({
				RateLimited: { max_calls: 5, window_ns: 60_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Rate limit exceeded. Maximum of 5 calls allowed every 60 seconds.');
		});

		it('should map InvalidDelegationChain', () => {
			const err = mapBtcGetPendingTransactionsError({
				InvalidDelegationChain: { msg: 'chain expired' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('II delegation chain verification failed: chain expired');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapBtcGetPendingTransactionsError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown BtcGetPendingTransactionsError');
		});
	});

	describe('mapBtcGetSpendableUtxosError', () => {
		it('should map InternalError', () => {
			const err = mapBtcGetSpendableUtxosError({ InternalError: { msg: 'reply too large' } });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('reply too large');
		});

		it('should map RateLimited', () => {
			const err = mapBtcGetSpendableUtxosError({
				RateLimited: { max_calls: 15, window_ns: 60_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe(
				'Rate limit exceeded. Maximum of 15 calls allowed every 60 seconds.'
			);
		});

		it('should map InvalidDelegationChain', () => {
			const err = mapBtcGetSpendableUtxosError({
				InvalidDelegationChain: { msg: 'chain expired' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('II delegation chain verification failed: chain expired');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapBtcGetSpendableUtxosError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown BtcGetSpendableUtxosError');
		});
	});

	describe('mapBtcGetBalanceError', () => {
		it('should map InternalError', () => {
			const err = mapBtcGetBalanceError({ InternalError: { msg: 'no public key' } });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('no public key');
		});

		it('should map BalanceUnavailable', () => {
			const err = mapBtcGetBalanceError({ BalanceUnavailable: { msg: 'canister rejected' } });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Bitcoin balance unavailable: canister rejected');
		});

		it('should map RateLimited', () => {
			const err = mapBtcGetBalanceError({
				RateLimited: { max_calls: 20, window_ns: 60_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe(
				'Rate limit exceeded. Maximum of 20 calls allowed every 60 seconds.'
			);
		});

		it('should map InvalidDelegationChain', () => {
			const err = mapBtcGetBalanceError({ InvalidDelegationChain: { msg: 'chain expired' } });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('II delegation chain verification failed: chain expired');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapBtcGetBalanceError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown BtcGetBalanceError');
		});
	});

	describe('mapBtcGetFeePercentilesError', () => {
		it('should map InternalError', () => {
			const err = mapBtcGetFeePercentilesError({
				InternalError: { msg: 'fee percentiles error' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('fee percentiles error');
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapBtcGetFeePercentilesError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown BtcGetFeePercentilesError');
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

		it('should map RateLimited', () => {
			const err = mapGetAllowedCyclesError({
				RateLimited: { max_calls: 10, window_ns: 60_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe(
				'Rate limit exceeded. Maximum of 10 calls allowed every 60 seconds.'
			);
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

		it('should map InvalidDelegationChain', () => {
			const err = mapAllowSigningError({
				InvalidDelegationChain: { msg: 'test message' }
			});

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('II delegation chain verification failed: test message');
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

	describe('mapSignOnramperWidgetUrlError', () => {
		it('should map SecretNotConfigured', () => {
			const err = mapSignOnramperWidgetUrlError({
				SecretNotConfigured: null
			});

			expect(err).toBeInstanceOf(OnramperSecretNotConfiguredError);
			expect(err.message).toBe(
				'OnRamper signing secret is not configured on the backend canister.'
			);
		});

		it('should map RateLimited', () => {
			const err = mapSignOnramperWidgetUrlError({
				RateLimited: { max_calls: 3, window_ns: 120_000_000_000n, caller: mockPrincipal }
			});

			expect(err).toBeInstanceOf(OnramperRateLimitedError);
			expect(err.message).toBe(
				'Rate limit exceeded. Maximum of 3 calls allowed every 120 seconds.'
			);
		});

		it('should return unknown error for unrecognized variant', () => {
			// @ts-expect-error testing unknown error variant
			const err = mapSignOnramperWidgetUrlError({ SomeOther: null });

			expect(err).toBeInstanceOf(CanisterInternalError);
			expect(err.message).toBe('Unknown SignOnramperWidgetUrlError');
		});
	});
});
