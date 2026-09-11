import AllTransactionsScroll from '$lib/components/transactions/AllTransactionsScroll.svelte';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import type { ResultSuccess } from '$lib/types/utils';
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
		let enterView: () => void;

		class IntersectionObserverManual implements IntersectionObserver {
			public readonly root: Element | Document | null = null;
			public readonly rootMargin: string = '';
			public readonly thresholds: ReadonlyArray<number> = [];
			public takeRecords: () => IntersectionObserverEntry[] = () => [];

			constructor(private callback: IntersectionObserverCallback) {}

			observe(element: Element) {
				enterView = () =>
					this.callback(
						[{ isIntersecting: true, target: element } as unknown as IntersectionObserverEntry],
						this
					);

				enterView();
			}
			disconnect = () => null;
			unobserve = () => null;
		}

		const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

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

			await settle();

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

			await settle();

			// Not asked again on its own: a chain that keeps failing must not be retried in a loop.
			expect(onLoadMore).toHaveBeenCalledOnce();

			enterView();

			// The retry loaded, so the scroll carries on and asks once more, which comes back empty.
			await waitFor(() => {
				expect(onLoadMore).toHaveBeenCalledTimes(3);
			});

			await settle();

			enterView();

			expect(onLoadMore).toHaveBeenCalledTimes(3);
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
