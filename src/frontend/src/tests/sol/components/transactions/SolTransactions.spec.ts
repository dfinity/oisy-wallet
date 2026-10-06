import { SOLANA_TOKEN, SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { NO_TRANSACTIONS_PLACEHOLDER } from '$lib/constants/test-ids.constants';
import SolTransactions from '$sol/components/transactions/SolTransactions.svelte';
import { loadOlderSolTokenTransactions } from '$sol/services/sol-history-pagers.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import { render } from '@testing-library/svelte';

vi.mock('$sol/services/sol-history-pagers.services', () => ({
	loadOlderSolTokenTransactions: vi.fn().mockResolvedValue({ success: true })
}));

describe('SolTransactions', () => {
	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		mockPage.reset();
		mockPage.mockToken(SOLANA_TOKEN);

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	// The worker's first page holds the network's newest transactions only: a token whose
	// transactions are all older gets an empty list, and only its own pager reaches them.
	it('should page the token history when the worker posted an empty list', () => {
		solTransactionsStore.set({ tokenId: SOLANA_TOKEN_ID, transactions: [] });

		const { getByTestId } = render(SolTransactions);

		expect(loadOlderSolTokenTransactions).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ token: SOLANA_TOKEN })
		);
		expect(getByTestId(NO_TRANSACTIONS_PLACEHOLDER)).toBeInTheDocument();
	});

	it('should show the transactions it holds, without the placeholder', () => {
		solTransactionsStore.set({
			tokenId: SOLANA_TOKEN_ID,
			transactions: [{ data: createMockSolTransactionUi('held-tx'), certified: false }]
		});

		const { queryByTestId } = render(SolTransactions);

		expect(queryByTestId(NO_TRANSACTIONS_PLACEHOLDER)).not.toBeInTheDocument();
	});

	it('should not page before the worker posted the list', () => {
		render(SolTransactions);

		expect(loadOlderSolTokenTransactions).not.toHaveBeenCalled();
	});
});
