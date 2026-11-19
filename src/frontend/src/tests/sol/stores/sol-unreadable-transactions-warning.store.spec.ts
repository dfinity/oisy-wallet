import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as infoUtils from '$lib/utils/info.utils';
import {
	solUnreadableTransactionDismissal,
	solUnreadableTransactionsWarningStore
} from '$sol/stores/sol-unreadable-transactions-warning.store';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { get } from 'svelte/store';

describe('sol-unreadable-transactions-warning.store', () => {
	const { signature } = mockSolSignatureResponse();
	const { signature: signature2 } = mockSolSignatureResponse();

	beforeEach(() => {
		vi.restoreAllMocks();

		solUnreadableTransactionsWarningStore.reset();
	});

	describe('solUnreadableTransactionDismissal', () => {
		it('should name an SPL token by its mint', () => {
			expect(solUnreadableTransactionDismissal({ token: USDC_TOKEN, signature })).toBe(
				`${signature}:${USDC_TOKEN.address}`
			);
		});

		it('should name SOL by the signature alone', () => {
			expect(solUnreadableTransactionDismissal({ token: SOLANA_TOKEN, signature })).toBe(
				`${signature}:`
			);
		});
	});

	describe('dismiss', () => {
		it('should record each transaction of each token', () => {
			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature, signature2] },
				{ token: USDC_TOKEN, signatures: [signature] }
			]);

			expect(get(solUnreadableTransactionsWarningStore)).toStrictEqual([
				`${signature}:`,
				`${signature2}:`,
				`${signature}:${USDC_TOKEN.address}`
			]);
		});

		it('should write the dismissals through to the session storage', () => {
			const spySave = vi.spyOn(infoUtils, 'saveHideInfoQualifiers');

			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature] }
			]);

			expect(spySave).toHaveBeenCalledExactlyOnceWith({
				key: 'oisy_sol_hide_unsupported_transactions',
				qualifiers: [`${signature}:`]
			});
		});

		it('should not record the same transaction twice', () => {
			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature, signature] }
			]);
			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature] }
			]);

			expect(get(solUnreadableTransactionsWarningStore)).toStrictEqual([`${signature}:`]);
		});

		it('should not notify when every transaction is already dismissed', () => {
			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature] }
			]);

			const notified = vi.fn();
			const unsubscribe = solUnreadableTransactionsWarningStore.subscribe(notified);

			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature] }
			]);

			// Only the subscription's own initial call.
			expect(notified).toHaveBeenCalledOnce();

			unsubscribe();
		});
	});

	describe('reset', () => {
		it('should forget every dismissal', () => {
			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature] }
			]);

			solUnreadableTransactionsWarningStore.reset();

			expect(get(solUnreadableTransactionsWarningStore)).toStrictEqual([]);
		});
	});
});
