import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTransactionsScroll from '$icp/components/transactions/IcTransactionsScroll.svelte';
import { loadNextIcTransactions } from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { nullishSignOut } from '$lib/services/auth.services';
import { token } from '$lib/stores/token.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { createIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

vi.mock('$icp/services/ic-transactions.services', () => ({
	loadNextIcTransactions: vi.fn()
}));

describe('IcTransactionsScroll', () => {
	const mockToken = ICP_TOKEN;

	const mockTransactions: IcTransactionUi[] = [
		createIcTransactionUiMock('tx1'),
		createIcTransactionUiMock('tx2')
	];

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
			render(IcTransactionsScroll, { token: mockToken });

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

			render(IcTransactionsScroll, { token: mockToken });

			expect(loadNextIcTransactions).not.toHaveBeenCalled();

			expect(nullishSignOut).toHaveBeenCalledOnce();
		});

		it('should not load next transactions if the token is nullish', () => {
			token.reset();

			render(IcTransactionsScroll, { token: mockToken });

			expect(loadNextIcTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the transactions store is nullish', () => {
			icTransactionsStore.reset(mockToken.id);

			render(IcTransactionsScroll, { token: mockToken });

			expect(loadNextIcTransactions).not.toHaveBeenCalled();
		});

		it('should not load next transactions if the transactions store is empty', () => {
			icTransactionsStore.reset(mockToken.id);
			icTransactionsStore.prepend({ tokenId: mockToken.id, transactions: [] });

			render(IcTransactionsScroll, { token: mockToken });

			expect(loadNextIcTransactions).not.toHaveBeenCalled();
		});
	});
});
