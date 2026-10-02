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

		vi.mocked(loadOlderXrpTransactions).mockResolvedValue({ success: false });

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

	// Neither rows the micro-transaction filter hides nor a round of pages that held no row move the
	// end of the list, so only the pager's result asks for the next round.
	it('should ask again after a round the pager got through, with or without a row', async () => {
		vi.mocked(loadOlderXrpTransactions).mockResolvedValueOnce({ success: true });

		render(XrpTransactionsScroll, { token: XRP_TOKEN, children: mockSnippet });

		await waitFor(() => expect(loadOlderXrpTransactions).toHaveBeenCalledTimes(2));
	});

	it('should not ask again at once after a failed page', async () => {
		vi.mocked(loadOlderXrpTransactions).mockResolvedValue({
			success: false,
			err: new Error('account_tx down')
		});

		render(XrpTransactionsScroll, { token: XRP_TOKEN, children: mockSnippet });

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(loadOlderXrpTransactions).toHaveBeenCalledOnce();
	});
});
