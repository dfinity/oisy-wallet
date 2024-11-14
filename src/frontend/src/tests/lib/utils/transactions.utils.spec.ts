import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import type { BtcTransactionUi } from '$btc/types/btc';
import {
	BTC_MAINNET_TOKEN,
	BTC_MAINNET_TOKEN_ID,
	BTC_TESTNET_TOKEN,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens.btc.env';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { AnyTransactionUi } from '$lib/types/transaction';
import { mapAllTransactionsUi, sortTransactions } from '$lib/utils/transactions.utils';
import { createMockBtcTransactionsUi } from '$tests/mocks/btc.mock';

describe('transactions.utils', () => {
	describe('mapAllTransactionsUi', () => {
		const certified = false;

		const mockBtcMainnetTransactions: BtcTransactionUi[] = createMockBtcTransactionsUi(5);

		const mockBtcTestnetTransactions: BtcTransactionUi[] = createMockBtcTransactionsUi(3);

		const mockBtcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>> = {
			[BTC_MAINNET_TOKEN_ID]: mockBtcMainnetTransactions.map((data) => ({ data, certified })),
			[BTC_TESTNET_TOKEN_ID]: mockBtcTestnetTransactions.map((data) => ({ data, certified }))
		};

		describe('BTC transactions', () => {
			const tokens = [BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN];

			it('should map BTC mainnet transactions correctly', () => {
				const result = mapAllTransactionsUi({ tokens, $btcTransactions: mockBtcTransactions });

				expect(result).toHaveLength(mockBtcMainnetTransactions.length);
				expect(result).toEqual(
					mockBtcMainnetTransactions.map((transaction) => ({
						...transaction,
						component: BtcTransaction
					}))
				);
			});

			it('should return an empty array if the BTC transactions store is not initialized', () => {
				const result = mapAllTransactionsUi({ tokens, $btcTransactions: undefined });

				expect(result).toEqual([]);
			});

			it('should return an empty array if there are no transactions for BTC mainnet', () => {
				const mockBtcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>> = {
					[BTC_TESTNET_TOKEN_ID]: mockBtcTestnetTransactions.map((data) => ({ data, certified }))
				};

				const result = mapAllTransactionsUi({ tokens, $btcTransactions: mockBtcTransactions });

				expect(result).toEqual([]);
			});
		});
	});

	describe('sortTransactions', () => {
		const transaction1 = { timestamp: 1 } as AnyTransactionUi;
		const transaction2 = { timestamp: 2 } as AnyTransactionUi;
		const transaction3 = { timestamp: 3 } as AnyTransactionUi;
		const transactionWithNullTimestamp = { timestamp: undefined } as AnyTransactionUi;

		it('should sort transactions in descending order by timestamp', () => {
			const result = [transaction2, transaction1, transaction3].sort((a, b) =>
				sortTransactions({ transactionA: a, transactionB: b })
			);
			expect(result).toEqual([transaction3, transaction2, transaction1]);
		});

		it('should sort transactions with nullish timestamps first', () => {
			const result = [transaction1, transactionWithNullTimestamp, transaction2].sort((a, b) =>
				sortTransactions({ transactionA: a, transactionB: b })
			);
			expect(result).toEqual([transactionWithNullTimestamp, transaction2, transaction1]);
		});
	});
});
