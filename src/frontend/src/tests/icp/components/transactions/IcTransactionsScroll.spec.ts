import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { getTransactions } from '$icp/api/icp-index.api';
import IcTransactionsScroll from '$icp/components/transactions/IcTransactionsScroll.svelte';
import type * as IcTransactionsServices from '$icp/services/ic-transactions.services';
import { loadNextIcTransactions } from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { token } from '$lib/stores/token.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	INTERSECTION_OBSERVER_ACTIVE_INTERVAL,
	IntersectionObserverActive,
	IntersectionObserverActiveInterval,
	IntersectionObserverManual,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { createIcTransactionUiMockList } from '$tests/utils/transactions-stores.test-utils';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$icp/services/ic-transactions.services', () => ({
	loadNextIcTransactions: vi.fn()
}));

vi.mock('$icp/api/icp-index.api', () => ({
	getTransactions: vi.fn()
}));

describe('IcTransactionsScroll', () => {
	const mockToken = ICP_TOKEN;

	const mockTransactions: IcTransactionUi[] = createIcTransactionUiMockList(2);

	const mockLastId = mockTransactions[mockTransactions.length - 1].id;

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

		token.set(mockToken);

		icTransactionsStore.reset(mockToken.id);

		icTransactionsStore.append({
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
			render(IcTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextIcTransactions).toHaveBeenCalledOnce();
			expect(loadNextIcTransactions).toHaveBeenNthCalledWith(1, {
				lastId: mockLastId,
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				token: mockToken,
				signalEnd: expect.any(Function)
			});
		});

		it('should not load next transactions if identity is nullish', () => {
			mockAuthStore(null);

			render(IcTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextIcTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the token is nullish', () => {
			token.reset();

			render(IcTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextIcTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the transactions store is nullish', () => {
			icTransactionsStore.reset(mockToken.id);

			render(IcTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextIcTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the transactions store is empty', () => {
			icTransactionsStore.reset(mockToken.id);
			icTransactionsStore.prepend({ tokenId: mockToken.id, transactions: [] });

			render(IcTransactionsScroll, { token: mockToken, children: mockSnippet });

			expect(loadNextIcTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if there are no more transactions', async () => {
			Object.defineProperty(window, 'IntersectionObserver', {
				writable: true,
				configurable: true,
				value: IntersectionObserverActiveInterval
			});

			const interval = INTERSECTION_OBSERVER_ACTIVE_INTERVAL;

			vi.useFakeTimers();

			vi.mocked(loadNextIcTransactions).mockImplementationOnce(
				async ({ signalEnd }: { signalEnd: () => void }) => {
					signalEnd();
					return await Promise.resolve({ success: true });
				}
			);

			render(IcTransactionsScroll, { token: mockToken, children: mockSnippet });

			await vi.advanceTimersByTimeAsync(interval + 1000);

			expect(loadNextIcTransactions).toHaveBeenCalledOnce();
			expect(loadNextIcTransactions).toHaveBeenNthCalledWith(1, {
				lastId: mockLastId,
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				token: mockToken,
				signalEnd: expect.any(Function)
			});

			await vi.advanceTimersByTimeAsync(interval * 2);

			expect(loadNextIcTransactions).toHaveBeenCalledOnce();

			vi.useRealTimers();
		});

		// Driven through the real service against a failing Index canister, since the service is what
		// used to end the scroll: its update-call error handler signalled the end.
		describe('when a page fails', () => {
			const { enterView } = IntersectionObserverManual;

			const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

			beforeEach(async () => {
				window.IntersectionObserver = IntersectionObserverManual;

				const { loadNextIcTransactions: actualLoadNextIcTransactions } = await vi.importActual<
					typeof IcTransactionsServices
				>('$icp/services/ic-transactions.services');

				vi.mocked(loadNextIcTransactions).mockImplementation(actualLoadNextIcTransactions);

				vi.mocked(getTransactions).mockRejectedValue(new Error('Index canister unavailable'));

				// Real block indexes, which the service needs as the cursor of the next page.
				icTransactionsStore.reset(mockToken.id);
				icTransactionsStore.append({
					tokenId: mockToken.id,
					transactions: createMockIcTransactionsUi(2).map((transaction) => ({
						data: transaction,
						certified: false
					}))
				});
			});

			afterEach(() => {
				window.IntersectionObserver = IntersectionObserverActive;
			});

			it('should keep the scroll and ask again once the end comes back into view', async () => {
				render(IcTransactionsScroll, { token: mockToken, children: mockSnippet });

				await waitFor(() => expect(getTransactions).toHaveBeenCalled());

				await settle();

				// Not asked again on its own, so a failing canister is not retried in a loop.
				expect(loadNextIcTransactions).toHaveBeenCalledOnce();

				const requests = vi.mocked(getTransactions).mock.calls.length;

				enterView();

				await waitFor(() => expect(loadNextIcTransactions).toHaveBeenCalledTimes(2));

				expect(vi.mocked(getTransactions).mock.calls.length).toBeGreaterThan(requests);
			});

			it('should still stop once the history runs out', async () => {
				vi.mocked(getTransactions).mockResolvedValue({
					transactions: []
				} as unknown as Awaited<ReturnType<typeof getTransactions>>);

				render(IcTransactionsScroll, { token: mockToken, children: mockSnippet });

				await waitFor(() => expect(getTransactions).toHaveBeenCalled());

				await settle();

				const requests = vi.mocked(getTransactions).mock.calls.length;

				enterView();

				await settle();

				expect(getTransactions).toHaveBeenCalledTimes(requests);
			});
		});
	});
});
