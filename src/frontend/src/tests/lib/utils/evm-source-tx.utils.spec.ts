import { toEvmSourceTxOutcome } from '$lib/utils/evm-source-tx.utils';

describe('evm-source-tx.utils', () => {
	describe('toEvmSourceTxOutcome', () => {
		it('reads a mined, executed transaction as succeeded', () => {
			expect(toEvmSourceTxOutcome({ receipt: { status: 1 }, txNonce: 5 })).toBe('succeeded');
		});

		it('reads a mined, reverted transaction as reverted', () => {
			expect(toEvmSourceTxOutcome({ receipt: { status: 0 }, txNonce: 5 })).toBe('reverted');
		});

		it('reads an unexpected receipt shape as unknown', () => {
			expect(toEvmSourceTxOutcome({ receipt: { status: null }, txNonce: 5 })).toBe('unknown');
		});

		it('reads a missing receipt with an unconsumed nonce as pending', () => {
			expect(toEvmSourceTxOutcome({ receipt: null, confirmedNonce: 5, txNonce: 5 })).toBe(
				'pending'
			);
		});

		it('reads a missing receipt with a consumed nonce as replaced', () => {
			expect(toEvmSourceTxOutcome({ receipt: null, confirmedNonce: 6, txNonce: 5 })).toBe(
				'replaced'
			);
		});

		it('stays pending when the confirmed nonce is unknown', () => {
			expect(toEvmSourceTxOutcome({ receipt: null, txNonce: 5 })).toBe('pending');
		});
	});
});
