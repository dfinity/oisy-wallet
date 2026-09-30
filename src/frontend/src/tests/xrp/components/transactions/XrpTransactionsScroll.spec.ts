import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { token } from '$lib/stores/token.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import XrpTransactionsScroll from '$xrp/components/transactions/XrpTransactionsScroll.svelte';
import { loadOlderXrpTransactions } from '$xrp/services/xrp-history-pager.services';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$xrp/services/xrp-history-pager.services', () => ({
	loadOlderXrpTransactions: vi.fn()
}));

describe('XrpTransactionsScroll', () => {
	const mockTransaction: XrpTransactionUi = {
		id: 'HASH1',
		type: 'receive',
		status: 'confirmed',
		value: 5_000_000n,
		from: 'rSender',
		to: mockXrpAddress,
		timestamp: 1n
	};

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

		token.set(XRP_TOKEN);

		xrpTransactionsStore.reset(XRP_TOKEN.id);

		xrpTransactionsStore.prepend({
			tokenId: XRP_TOKEN.id,
			transactions: [{ data: mockTransaction, certified: false }]
		});
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	it('should page the token through its pager, without a cursor of its own making', () => {
		render(XrpTransactionsScroll, { token: XRP_TOKEN, children: mockSnippet });

		expect(loadOlderXrpTransactions).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			token: XRP_TOKEN,
			signalEnd: expect.any(Function)
		});
	});

	it('should not page before the worker delivered the first transactions', () => {
		xrpTransactionsStore.reset(XRP_TOKEN.id);

		render(XrpTransactionsScroll, { token: XRP_TOKEN, children: mockSnippet });

		expect(loadOlderXrpTransactions).not.toHaveBeenCalled();
	});

	// The first page can map to no rows while older payments exist.
	it('should page an initialized list that holds no rows', () => {
		xrpTransactionsStore.reset(XRP_TOKEN.id);
		xrpTransactionsStore.prepend({ tokenId: XRP_TOKEN.id, transactions: [] });

		render(XrpTransactionsScroll, { token: XRP_TOKEN, children: mockSnippet });

		expect(loadOlderXrpTransactions).toHaveBeenCalledOnce();
	});

	// Rows the micro-transaction filter hides do not move the end of the list, so only the reported
	// progress asks for the next page.
	it('should ask for the next page when the pager added rows', async () => {
		vi.mocked(loadOlderXrpTransactions).mockImplementationOnce(() => {
			xrpTransactionsStore.append({
				tokenId: XRP_TOKEN.id,
				transactions: [{ data: { ...mockTransaction, id: 'HASH2' }, certified: false }]
			});

			return Promise.resolve({ success: true });
		});

		render(XrpTransactionsScroll, { token: XRP_TOKEN, children: mockSnippet });

		await waitFor(() => expect(loadOlderXrpTransactions).toHaveBeenCalledTimes(2));
	});

	it('should not ask again when the pager added nothing', async () => {
		vi.mocked(loadOlderXrpTransactions).mockResolvedValue({ success: true });

		render(XrpTransactionsScroll, { token: XRP_TOKEN, children: mockSnippet });

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(loadOlderXrpTransactions).toHaveBeenCalledOnce();
	});
});
