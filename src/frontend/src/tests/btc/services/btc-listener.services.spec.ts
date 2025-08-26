import { syncWallet, syncWalletError } from '$btc/services/btc-listener.services';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockBtcTransactionUi } from '$tests/mocks/btc-transactions.mock';
import { jsonReplacer } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('btc-listener', () => {
	const tokenId: TokenId = parseTokenId('testTokenId');

	const mockBalance = 1000n;

	const mockTransactions = [mockBtcTransactionUi, mockBtcTransactionUi];

	const mockCertifiedTransactions = (transactions: BtcTransactionUi[]) =>
		transactions.map((data) => ({
			data,
			certified: false
		}));

	const mockPostMessage = ({
		balance = mockBalance,
		transactions = mockTransactions
	}: {
		balance?: bigint | null;
		transactions?: BtcTransactionUi[];
	}): BtcPostMessageDataResponseWallet => ({
		wallet: {
			balance: {
				certified: true,
				data: balance
			},
			newTransactions: JSON.stringify(mockCertifiedTransactions(transactions), jsonReplacer)
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();

		balancesStore.reset(tokenId);
		btcTransactionsStore.reset(tokenId);
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

		it('should set the transactions in btcTransactionsStore', () => {
			syncWallet({ data: mockPostMessage({}), tokenId });

			const transactions = get(btcTransactionsStore);

			expect(transactions?.[tokenId]).toEqual(mockCertifiedTransactions(mockTransactions));
		});

		it('should prepend the transactions in btcTransactionsStore', () => {
			syncWallet({ data: mockPostMessage({}), tokenId });

			const transactionsToPrepend = [...mockTransactions, ...mockTransactions];

			const mockMorePostMessage: BtcPostMessageDataResponseWallet = mockPostMessage({
				transactions: transactionsToPrepend
			});

			syncWallet({ data: mockMorePostMessage, tokenId });

			const transactions = get(btcTransactionsStore);

			expect(transactions?.[tokenId]).toEqual(mockCertifiedTransactions(transactionsToPrepend));
		});

		it('should reset balanceStore if balance is empty', () => {
			syncWallet({ data: mockPostMessage({ balance: null }), tokenId });

			const balance = get(balancesStore);

			expect(balance?.[tokenId]).toBeNull();
		});
	});

	describe('syncWalletError', () => {
		it('should reset balanceStore and btcTransactionsStore on error', () => {
			syncWallet({ data: mockPostMessage({}), tokenId });

			syncWalletError({ error: 'test', tokenId, hideToast: true });

			const balance = get(balancesStore);
			const transactions = get(btcTransactionsStore);

			expect(console.warn).toHaveBeenCalledOnce();
			expect(balance?.[tokenId]).toBeNull();
			expect(transactions?.[tokenId]).toBeNull();
		});
	});
});
