import SolTransactionsSkeletons from '$sol/components/transactions/SolTransactionsSkeletons.svelte';
import { token } from '$lib/stores/token.store';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { render } from '@testing-library/svelte';
import { SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';

describe('SolTransactionsSkeletons', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		token.set(null);
		solTransactionsStore.reset(SOLANA_TOKEN_ID);
	});

	it('should show skeletons when token is null', () => {
		const { getAllByTestId } = render(SolTransactionsSkeletons);

		// The base TransactionsSkeletons component shows 5 skeleton cards
		Array.from({ length: 5 }).forEach((_, i) => {
			expect(getAllByTestId(`sol-txn-${i}`)).toBeTruthy();
		});
	});

	it('should show skeletons when transactions are undefined for token', () => {
		token.set(SOLANA_TOKEN);

		const { getAllByTestId } = render(SolTransactionsSkeletons);

		Array.from({ length: 5 }).forEach((_, i) => {
			expect(getAllByTestId(`sol-txn-${i}`)).toBeTruthy();
		});
	});

	it('should not show skeletons when transactions are defined', () => {
		token.set(SOLANA_TOKEN);
		solTransactionsStore.append({
			tokenId: SOLANA_TOKEN_ID,
			transactions: []
		});

		const { container } = render(SolTransactionsSkeletons);

		expect(container.querySelectorAll('[data-testid^="sol-txn-"]')).toHaveLength(0);
	});
});