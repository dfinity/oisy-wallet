import { SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { token } from '$lib/stores/token.store';
import { solTransactions } from '$sol/derived/sol-transactions.derived';
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
