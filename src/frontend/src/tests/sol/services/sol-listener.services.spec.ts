import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { syncWallet, syncWalletError } from '$sol/services/sol-listener.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolBalance } from '$sol/types/sol-balance';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { mockSolCertifiedTransactions } from '$tests/mocks/sol-transactions.mock';
import { jsonReplacer } from '@dfinity/utils';
import { lamports } from '@solana/kit';
import { get } from 'svelte/store';

describe('sol-listener.services', () => {
	describe('sol-listener', () => {
		const tokenId: TokenId = parseTokenId('testTokenId');
		const mockBalance = lamports(1000n);

		const mockPostMessage = ({
			balance = mockBalance,
			newTransactions = JSON.stringify(mockSolCertifiedTransactions, jsonReplacer)
		}: {
			balance?: SolBalance | null;
			newTransactions?: string;
		}): SolPostMessageDataResponseWallet => ({
			wallet: {
				balance: {
					certified: true,
					data: balance
				},
				newTransactions
			}
		});

		beforeEach(() => {
			vi.clearAllMocks();
			balancesStore.reset(tokenId);
			solTransactionsStore.reset(tokenId);
		});

		describe('syncWallet', () => {
			it('should set the balance in balancesStore', () => {
				syncWallet({ data: mockPostMessage({}), tokenId });

				const balance = get(balancesStore);

				expect(balance?.[tokenId]).toEqual({
					data: mockBalance,
					certified: true
				});
			});

			it('should reset balanceStore if balance is empty', () => {
				syncWallet({ data: mockPostMessage({ balance: null }), tokenId });

				const balance = get(balancesStore);

				expect(balance?.[tokenId]).toBeNull();
			});

			it('should prepend new transactions to solTransactionsStore', () => {
				const newTransactions = JSON.stringify(mockSolCertifiedTransactions, jsonReplacer);
				syncWallet({ data: mockPostMessage({ newTransactions }), tokenId });

				const transactions = get(solTransactionsStore);

				expect(transactions?.[tokenId]).toEqual(mockSolCertifiedTransactions);
			});
		});

		describe('syncWalletError', () => {
			it('should reset balanceStore on error', () => {
				syncWallet({ data: mockPostMessage({}), tokenId });

				syncWalletError({ error: 'test error', tokenId, hideToast: true });

				const balance = get(balancesStore);

				expect(balance?.[tokenId]).toBeNull();
			});

			it('should reset transactionsStore on error', () => {
				const newTransactions = JSON.stringify(mockSolCertifiedTransactions, jsonReplacer);
				syncWallet({ data: mockPostMessage({ newTransactions }), tokenId });

				syncWalletError({ error: 'test error', tokenId, hideToast: true });

				const transactions = get(solTransactionsStore);

				expect(transactions?.[tokenId]).toBeNull();
			});

			it('should log a warning if hideToast is true', () => {
				syncWalletError({ error: 'test error', tokenId, hideToast: true });

				expect(console.warn).toHaveBeenCalled();
			});
		});
	});
});
