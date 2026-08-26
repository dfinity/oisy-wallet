import AllTransactionsScroll from '$lib/components/transactions/AllTransactionsScroll.svelte';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('AllTransactionsScroll', () => {
	const pageSize = Number(WALLET_PAGINATION);

	const makeTransactions = (count: number): AllTransactionUiWithCmp[] =>
		Array.from(
			{ length: count },
			(_, index) =>
				({
					transaction: { id: `${index}`, timestamp: index }
				}) as unknown as AllTransactionUiWithCmp
		);

	beforeAll(() => {
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => vi.clearAllMocks());

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	it('should reveal every page in memory before asking the chains, and ask only once', async () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined);

		render(AllTransactionsScroll, {
			props: {
				sortedTransactions: makeTransactions(pageSize * 5),
				transactionsToDisplay: [],
				onLoadMore,
				children: mockSnippet
			}
		});

		// Five pages have to be revealed first. Asking per intersection would show five calls here.
		await waitFor(() => {
			expect(onLoadMore).toHaveBeenCalledOnce();
		});
	});

	it('should ask the chains for more once everything loaded is on screen', async () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined);

		render(AllTransactionsScroll, {
			props: {
				sortedTransactions: makeTransactions(pageSize),
				transactionsToDisplay: makeTransactions(pageSize),
				onLoadMore,
				children: mockSnippet
			}
		});

		await waitFor(() => {
			expect(onLoadMore).toHaveBeenCalled();
		});
	});

	// The observer fires again on every layout change, so a fetch that brings nothing back has to
	// stop the scroll asking. Without this the component spins against chains that are already dry.
	it('should stop asking after a fetch brings nothing back', async () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined);

		render(AllTransactionsScroll, {
			props: {
				sortedTransactions: makeTransactions(pageSize),
				transactionsToDisplay: makeTransactions(pageSize),
				onLoadMore,
				children: mockSnippet
			}
		});

		await waitFor(() => {
			expect(onLoadMore).toHaveBeenCalledOnce();
		});
	});

	it('should not ask the chains when they are already exhausted', async () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined);

		render(AllTransactionsScroll, {
			props: {
				sortedTransactions: makeTransactions(pageSize),
				transactionsToDisplay: makeTransactions(pageSize),
				onLoadMore,
				exhausted: true,
				children: mockSnippet
			}
		});

		await waitFor(() => {
			expect(onLoadMore).not.toHaveBeenCalled();
		});
	});

	it('should render without a loader above it', () => {
		expect(() =>
			render(AllTransactionsScroll, {
				props: {
					sortedTransactions: makeTransactions(pageSize),
					transactionsToDisplay: makeTransactions(pageSize),
					children: mockSnippet
				}
			})
		).not.toThrow();
	});
});
