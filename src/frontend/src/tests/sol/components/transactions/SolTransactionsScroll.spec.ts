import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { token } from '$lib/stores/token.store';
import SolTransactionsScroll from '$sol/components/transactions/SolTransactionsScroll.svelte';
import { loadNextSolTransactions } from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

vi.mock('$sol/services/sol-transactions.services', () => ({
	loadNextSolTransactions: vi.fn()
}));

describe('SolTransactionsScroll', () => {
	const mockToken = SOLANA_TOKEN;

	const mockTransactions: SolTransactionUi[] = createMockSolTransactionsUi(13).map((tx) => ({
		...tx,
		from: mockSolAddress
	}));

	const mockLastSignature = mockTransactions[mockTransactions.length - 1].signature;

	const mockSnippet = createMockSnippet('Mock Snippet');

	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();

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
		it('should load next transactions', () => {
			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextSolTransactions).toHaveBeenCalledOnce();
			expect(loadNextSolTransactions).toHaveBeenNthCalledWith(1, {
				token: mockToken,
				before: mockLastSignature,
				signalEnd: expect.any(Function)
			});
		});

		it('should not load next transactions if the token is nullish', () => {
			token.reset();

			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextSolTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the transactions store is nullish', () => {
			solTransactionsStore.reset(mockToken.id);

			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextSolTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the transactions store is empty', () => {
			solTransactionsStore.reset(mockToken.id);
			solTransactionsStore.prepend({ tokenId: mockToken.id, transactions: [] });

			render(SolTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextSolTransactions).not.toHaveBeenCalled();
		});
	});
});
