import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { token } from '$lib/stores/token.store';
import SolTransactionsScroll from '$sol/components/transactions/SolTransactionsScroll.svelte';
import { loadOlderSolTokenTransactions } from '$sol/services/sol-history-pagers.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$sol/services/sol-history-pagers.services', () => ({
	loadOlderSolTokenTransactions: vi.fn()
}));

describe('SolTransactionsScroll', () => {
	const mockToken = SOLANA_TOKEN;

	const mockTransactions: SolTransactionUi[] = createMockSolTransactionsUi(13).map((tx) => ({
		...tx,
		from: mockSolAddress
	}));

	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(loadOlderSolTokenTransactions).mockResolvedValue({ success: false });

		mockAuthStore();

		token.set(mockToken);

		solTransactionsStore.reset(mockToken.id);

		solTransactionsStore.prepend({
			tokenId: mockToken.id,
			transactions: mockTransactions.map((transaction) => ({
				data: transaction,
				certified: false
			}))
		});
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	describe('when the infinite scroll is triggered', () => {
		it('should page the token through its own pager, without a cursor of its own making', () => {
			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadOlderSolTokenTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				token: mockToken,
				signalEnd: expect.any(Function)
			});
		});

		it('should not load next transactions if the token is nullish', () => {
			token.reset();

			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadOlderSolTokenTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the transactions store is nullish', () => {
			solTransactionsStore.reset(mockToken.id);

			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadOlderSolTokenTransactions).not.toHaveBeenCalled();
		});

		// The worker's first page holds the network's newest transactions only, which can include none
		// of this token's: an empty list it posted is where the token's own history starts.
		it('should load the token history when the worker posted an empty list', () => {
			solTransactionsStore.reset(mockToken.id);
			solTransactionsStore.prepend({ tokenId: mockToken.id, transactions: [] });

			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadOlderSolTokenTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				token: mockToken,
				signalEnd: expect.any(Function)
			});
		});

		// Neither rows the micro-transaction filter hides nor a round of pages that wrote no row move
		// the end of the list, so only the pager's result asks for the next round.
		it('should ask again after a round the pager got through, even when the list stays empty', async () => {
			solTransactionsStore.reset(mockToken.id);
			solTransactionsStore.prepend({ tokenId: mockToken.id, transactions: [] });

			vi.mocked(loadOlderSolTokenTransactions).mockResolvedValueOnce({ success: true });

			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			await waitFor(() => expect(loadOlderSolTokenTransactions).toHaveBeenCalledTimes(2));
		});

		it('should not ask again at once after a failed page', async () => {
			vi.mocked(loadOlderSolTokenTransactions).mockResolvedValue({
				success: false,
				err: new Error('getSignaturesForAddress failed')
			});

			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(loadOlderSolTokenTransactions).toHaveBeenCalledOnce();
		});
	});
});
