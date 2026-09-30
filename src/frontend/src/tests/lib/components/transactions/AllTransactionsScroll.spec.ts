import AllTransactionsScroll from '$lib/components/transactions/AllTransactionsScroll.svelte';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import type { ResultSuccess } from '$lib/types/utils';
import AllTransactionsScrollTest from '$tests/lib/components/transactions/AllTransactionsScrollTest.svelte';
import {
	IntersectionObserverActive,
	IntersectionObserverManual,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
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
		const onLoadMore = vi.fn().mockResolvedValue({ success: false });

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
		const onLoadMore = vi.fn().mockResolvedValue({ success: false });

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
		const onLoadMore = vi.fn().mockResolvedValue({ success: false });

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

	// The list handed to this component is filtered, so history that loads but does not match the
	// current filter leaves its length untouched. Going dry on that would strand the user.
	it('should keep asking while the loader reports new history, even if nothing new is displayed', async () => {
		const onLoadMore = vi
			.fn()
			.mockResolvedValueOnce({ success: true })
			.mockResolvedValueOnce({ success: true })
			.mockResolvedValue({ success: false });

		render(AllTransactionsScroll, {
			props: {
				sortedTransactions: makeTransactions(pageSize),
				transactionsToDisplay: makeTransactions(pageSize),
				onLoadMore,
				children: mockSnippet
			}
		});

		await waitFor(() => {
			expect(onLoadMore).toHaveBeenCalledTimes(3);
		});
	});

	it('should not ask the chains when they are already exhausted', async () => {
		const onLoadMore = vi.fn().mockResolvedValue({ success: false });

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

	// The browser reports the end of the list again only once the user scrolls it back into view, so
	// these drive that by hand instead of on every `observe`.
	describe('when the end of the list comes back into view', () => {
		const { enterView } = IntersectionObserverManual;

		const renderScroll = (onLoadMore: () => Promise<ResultSuccess>) =>
			render(AllTransactionsScroll, {
				props: {
					sortedTransactions: makeTransactions(pageSize),
					transactionsToDisplay: makeTransactions(pageSize),
					onLoadMore,
					children: mockSnippet
				}
			});

		beforeEach(() => {
			window.IntersectionObserver = IntersectionObserverManual;
		});

		afterEach(() => {
			window.IntersectionObserver = IntersectionObserverActive;
		});

		it('should stop asking after a fetch brings nothing back', async () => {
			const onLoadMore = vi.fn().mockResolvedValue({ success: false });

			renderScroll(onLoadMore);

			await waitFor(() => {
				expect(onLoadMore).toHaveBeenCalledOnce();
			});

			await runResolvedPromises();

			enterView();

			expect(onLoadMore).toHaveBeenCalledOnce();
		});

		// A failed page says nothing about whether the chains have more. Going dry on it left the list
		// stuck at that depth until unrelated rows happened to arrive.
		it('should ask again after a failed fetch, and load what it missed', async () => {
			const onLoadMore = vi
				.fn()
				.mockResolvedValueOnce({ success: false, err: new Error('RPC unavailable') })
				.mockResolvedValueOnce({ success: true })
				.mockResolvedValue({ success: false });

			renderScroll(onLoadMore);

			await waitFor(() => {
				expect(onLoadMore).toHaveBeenCalledOnce();
			});

			await runResolvedPromises();

			// Not asked again on its own: a chain that keeps failing must not be retried in a loop.
			expect(onLoadMore).toHaveBeenCalledOnce();

			enterView();

			// The retry loaded, so the scroll carries on and asks once more, which comes back empty.
			await waitFor(() => {
				expect(onLoadMore).toHaveBeenCalledTimes(3);
			});

			await runResolvedPromises();

			enterView();

			expect(onLoadMore).toHaveBeenCalledTimes(3);
		});

		// One chain loading does not make the round a success for the chain that failed: reporting
		// progress would re-arm the observer at once and retry that chain in a tight loop.
		it('should not ask again on its own when a fetch loaded from some chains and failed on another', async () => {
			const onLoadMore = vi
				.fn()
				.mockResolvedValueOnce({ success: true, err: new Error('RPC unavailable') })
				.mockResolvedValue({ success: false });

			renderScroll(onLoadMore);

			await waitFor(() => {
				expect(onLoadMore).toHaveBeenCalledOnce();
			});

			await runResolvedPromises();

			expect(onLoadMore).toHaveBeenCalledOnce();

			enterView();

			await waitFor(() => {
				expect(onLoadMore).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe('with a floor', () => {
		const onLoadMore = vi.fn().mockResolvedValue({ success: false });

		const displayed = (getAllByTestId: (testId: string) => HTMLElement[]) =>
			getAllByTestId('displayed-transaction').map(({ textContent }) => textContent);

		// Levelling brings rows from beyond the floor for some tokens only. Shown, they left the older
		// transactions of the token whose own oldest row set the floor out between them.
		it('should hold back rows older than the floor while the chains still have history', () => {
			const { getAllByTestId } = render(AllTransactionsScrollTest, {
				props: { sortedTransactions: makeTransactions(5), floor: 2, onLoadMore }
			});

			expect(displayed(getAllByTestId)).toEqual(['2', '3', '4']);
		});

		it('should reveal the rows a lower floor reaches', async () => {
			const { getAllByTestId, rerender } = render(AllTransactionsScrollTest, {
				props: { sortedTransactions: makeTransactions(5), floor: 2, onLoadMore }
			});

			await rerender({ floor: 0 });

			expect(displayed(getAllByTestId)).toEqual(['0', '1', '2', '3', '4']);
		});

		it('should show every row once the chains are exhausted', () => {
			const { getAllByTestId } = render(AllTransactionsScrollTest, {
				props: { sortedTransactions: makeTransactions(5), floor: 2, exhausted: true, onLoadMore }
			});

			expect(displayed(getAllByTestId)).toEqual(['0', '1', '2', '3', '4']);
		});

		it('should keep rows without a timestamp', () => {
			const undated = { transaction: { id: 'undated' } } as unknown as AllTransactionUiWithCmp;

			const { getAllByTestId } = render(AllTransactionsScrollTest, {
				props: { sortedTransactions: [...makeTransactions(3), undated], floor: 2, onLoadMore }
			});

			expect(displayed(getAllByTestId)).toEqual(['2', 'undated']);
		});

		it('should ask the chains for more once everything down to the floor is on screen', async () => {
			const { getAllByTestId } = render(AllTransactionsScrollTest, {
				props: {
					sortedTransactions: makeTransactions(pageSize * 3),
					floor: pageSize * 3 - 5,
					onLoadMore
				}
			});

			await waitFor(() => {
				expect(onLoadMore).toHaveBeenCalledOnce();
			});

			expect(displayed(getAllByTestId)).toHaveLength(5);
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
