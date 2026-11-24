import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import {
	blocksRetry,
	insufficientAllowanceMessage,
	insufficientAllowanceOutcome,
	mapInsufficientAllowanceToSwapError
} from '$lib/utils/allowance.utils';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { mockAllowanceLeft, mockInsufficientAllowanceError } from '$tests/mocks/allowance.mock';
import en from '$tests/mocks/i18n.mock';
import { Principal } from '@icp-sdk/core/principal';

describe('allowance.utils', () => {
	describe('insufficientAllowanceOutcome', () => {
		it('should be renewed when the allowance request was granted', () => {
			expect(
				insufficientAllowanceOutcome(
					mockInsufficientAllowanceError({ answer: 'granted', allowance: 2_917_000_000_000n })
				)
			).toBe('renewed');
		});

		it('should be refused when the allowance request was refused', () => {
			expect(
				insufficientAllowanceOutcome(mockInsufficientAllowanceError({ answer: 'refused' }))
			).toBe('refused');
		});

		it('should be renewed when the request was skipped with a larger allowance than at the failure', () => {
			expect(
				insufficientAllowanceOutcome(
					mockInsufficientAllowanceError({ answer: 'skipped', allowance: mockAllowanceLeft + 1n })
				)
			).toBe('renewed');
		});

		it('should be exceeded when the request was skipped with no larger allowance', () => {
			expect(
				insufficientAllowanceOutcome(
					mockInsufficientAllowanceError({ answer: 'skipped', allowance: mockAllowanceLeft })
				)
			).toBe('exceeded');
		});

		it('should be undefined for any other payment error', () => {
			expect(
				insufficientAllowanceOutcome(
					new SignerCanisterPaymentError({
						LedgerWithdrawFromError: {
							error: { InsufficientFunds: { balance: 1n } },
							ledger: Principal.fromText('um5iw-rqaaa-aaaaq-qaaba-cai')
						}
					})
				)
			).toBeUndefined();
		});

		it('should be undefined for any other error', () => {
			expect(insufficientAllowanceOutcome(new Error('test'))).toBeUndefined();
		});
	});

	describe('blocksRetry', () => {
		it('should let a renewed allowance be tried again', () => {
			expect(blocksRetry('renewed')).toBeFalsy();
		});

		it('should block a retry when the request was refused or the transaction costs more', () => {
			expect(blocksRetry('refused')).toBeTruthy();
			expect(blocksRetry('exceeded')).toBeTruthy();
		});
	});

	describe('insufficientAllowanceMessage', () => {
		it('should name each outcome', () => {
			expect(insufficientAllowanceMessage({ outcome: 'renewed', i18n: en })).toBe(
				replaceOisyPlaceholders(en.core.info.oisy_allowance_renewed)
			);
			expect(insufficientAllowanceMessage({ outcome: 'refused', i18n: en })).toBe(
				replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up)
			);
			expect(insufficientAllowanceMessage({ outcome: 'exceeded', i18n: en })).toBe(
				replaceOisyPlaceholders(en.core.warning.oisy_allowance_exceeded)
			);
		});
	});

	describe('mapInsufficientAllowanceToSwapError', () => {
		it('should be an info box that keeps Swap enabled when the allowance was renewed', () => {
			expect(
				mapInsufficientAllowanceToSwapError({
					err: mockInsufficientAllowanceError({ answer: 'granted', allowance: 2_917_000_000_000n }),
					i18n: en
				})
			).toEqual({
				variant: 'info',
				message: replaceOisyPlaceholders(en.core.info.oisy_allowance_renewed)
			});
		});

		it('should be a warning that disables Swap when the request was refused', () => {
			expect(
				mapInsufficientAllowanceToSwapError({
					err: mockInsufficientAllowanceError({ answer: 'refused' }),
					i18n: en
				})
			).toEqual({
				variant: 'warning',
				message: replaceOisyPlaceholders(en.core.warning.oisy_allowance_used_up),
				disablesSwap: true
			});
		});

		it('should be a warning that disables Swap when the transaction costs more than the allowance', () => {
			expect(
				mapInsufficientAllowanceToSwapError({
					err: mockInsufficientAllowanceError({ answer: 'skipped', allowance: mockAllowanceLeft }),
					i18n: en
				})
			).toEqual({
				variant: 'warning',
				message: replaceOisyPlaceholders(en.core.warning.oisy_allowance_exceeded),
				disablesSwap: true
			});
		});

		it('should be undefined for any other error', () => {
			expect(
				mapInsufficientAllowanceToSwapError({ err: new Error('test'), i18n: en })
			).toBeUndefined();
		});
	});
});
