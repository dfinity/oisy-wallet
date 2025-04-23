import { SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { token } from '$lib/stores/token.store';
import {
	solTransactions,
	solTransactionsInitialized,
	solTransactionsNotInitialized
} from '$sol/derived/sol-transactions.derived';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import { get } from 'svelte/store';

describe('sol-transactions.derived', () => {
	const transactions = [
		{
			data: createMockSolTransactionUi('tx1'),
			certified: false
		},
		{
			data: createMockSolTransactionUi('tx2'),
			certified: false
		}
	];

	beforeEach(() => {
		token.set(SOLANA_TOKEN);
	});

	describe('solTransactions', () => {
		it('should return an empty array when transactions store is empty', () => {
			const result = get(solTransactions);

			expect(result).toEqual([]);
		});

		it('should return empty array when transactions is nullish', () => {
			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN_ID,
				transactions
			});

			solTransactionsStore.nullify(SOLANA_TOKEN_ID);

			const result = get(solTransactions);

			expect(result).toHaveLength(0);
			expect(result).toEqual([]);
		});

		it('should return transactions for the current token', () => {
			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN_ID,
				transactions
			});

			const result = get(solTransactions);

			expect(result).toEqual(transactions.map(({ data }) => data));
		});
	});

	describe('solTransactionsInitialized', () => {
		it('should return false when transactions store is empty', () => {
			solTransactionsStore.reset(SOLANA_TOKEN_ID);
			const result = get(solTransactionsInitialized);

			expect(result).toBeFalsy();
		});

		it('should return false when transactions are nullish', () => {
			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN_ID,
				transactions
			});

			solTransactionsStore.nullify(SOLANA_TOKEN_ID);

			const result = get(solTransactionsInitialized);

			expect(result).toBeFalsy();
		});

		it('should return true when transactions are initialized', () => {
			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN_ID,
				transactions
			});

			const result = get(solTransactionsInitialized);

			expect(result).toBeTruthy();
		});
	});

	describe('solTransactionsNotInitialized', () => {
		it('should return true when transactions store is empty', () => {
			solTransactionsStore.reset(SOLANA_TOKEN_ID);
			const result = get(solTransactionsNotInitialized);

			expect(result).toBeTruthy();
		});

		it('should return true when transactions are nullish', () => {
			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN_ID,
				transactions
			});

			solTransactionsStore.nullify(SOLANA_TOKEN_ID);

			const result = get(solTransactionsNotInitialized);

			expect(result).toBeTruthy();
		});

		it('should return false when transactions are initialized', () => {
			solTransactionsStore.append({
				tokenId: SOLANA_TOKEN_ID,
				transactions
			});

			const result = get(solTransactionsNotInitialized);

			expect(result).toBeFalsy();
		});
	});
});
