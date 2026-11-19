import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import {
	NO_TRANSACTIONS_PLACEHOLDER,
	TRANSACTIONS_DATE_GROUP_PREFIX
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { token } from '$lib/stores/token.store';
import {
	IntersectionObserverActive,
	IntersectionObserverPassive
} from '$tests/mocks/infinite-scroll.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockXrpAddress } from '$tests/mocks/xrp.mock';
import XrpTransactions from '$xrp/components/transactions/XrpTransactions.svelte';
import { loadOlderXrpTransactions } from '$xrp/services/xrp-history-pager.services';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$xrp/services/xrp-history-pager.services', () => ({
	loadOlderXrpTransactions: vi.fn(),
	resetXrpHistoryPager: vi.fn()
}));

describe('XrpTransactions', () => {
	beforeAll(() => {
		// A populated list mounts the infinite scroll.
		Object.defineProperty(window, 'IntersectionObserver', {
			writable: true,
			configurable: true,
			value: IntersectionObserverActive
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(loadOlderXrpTransactions).mockResolvedValue({ success: false });

		token.set(XRP_TOKEN);
		mockPage.reset();
		modalStore.close();
		xrpTransactionsStore.clear(XRP_TOKEN.id);
	});

	afterAll(() => (global.IntersectionObserver = IntersectionObserverPassive));

	it('renders the transactions header', () => {
		const { getByText } = render(XrpTransactions);

		expect(getByText(get(i18n).transactions.text.title)).toBeInTheDocument();
	});

	it('renders the token details modal when it is opened', async () => {
		mockPage.mockToken(XRP_TOKEN);

		const { container } = render(XrpTransactions);

		expect(container).not.toHaveTextContent(get(i18n).tokens.details.title);

		modalStore.openXrpToken({ id: Symbol(), data: undefined });

		await waitFor(() => {
			expect(container).toHaveTextContent(get(i18n).tokens.details.title);
		});
	});

	it('renders the transactions inside the list that pages further back', () => {
		mockPage.mockToken(XRP_TOKEN);

		xrpTransactionsStore.prepend({
			tokenId: XRP_TOKEN.id,
			transactions: [
				{
					data: {
						id: 'HASH1',
						type: 'receive',
						status: 'confirmed',
						value: 5_000_000n,
						from: 'rSender',
						to: mockXrpAddress,
						timestamp: 1n
					},
					certified: false
				}
			]
		});

		const { getByTestId } = render(XrpTransactions);

		expect(getByTestId(`${TRANSACTIONS_DATE_GROUP_PREFIX}-xrp-0`)).toBeInTheDocument();
	});

	// The first page can map to no rows, or only to hidden ones, while older payments exist.
	it('pages further back from an initialized list that shows no rows', () => {
		mockPage.mockToken(XRP_TOKEN);

		xrpTransactionsStore.prepend({ tokenId: XRP_TOKEN.id, transactions: [] });

		const { getByTestId } = render(XrpTransactions);

		expect(loadOlderXrpTransactions).toHaveBeenCalledOnce();

		// Outside the scroll, which renders its children as list items.
		expect(getByTestId(NO_TRANSACTIONS_PLACEHOLDER).closest('ul')).toBeNull();
	});
});
