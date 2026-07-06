import type { IcToken } from '$icp/types/ic-token';
import OisyTradeActiveOrders from '$lib/components/trading/OisyTradeActiveOrders.svelte';
import { modalStore } from '$lib/stores/modal.store';
import type { OisyTradeOrderView } from '$lib/types/oisy-trade';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

const { activeOrdersMock, hasAssetsMock, pairsMock } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return {
		activeOrdersMock: createWritable([]),
		hasAssetsMock: createWritable(false),
		pairsMock: createWritable([])
	};
});

vi.mock(import('$lib/derived/oisy-trade.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get oisyTradeActiveOrders() {
		return activeOrdersMock;
	},
	get oisyTradeHasAssets() {
		return hasAssetsMock;
	},
	get oisyTradePairs() {
		return pairsMock;
	}
}));

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOrderBook: vi.fn(() => Promise.resolve(undefined))
}));

const base: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8 };
const quote: IcToken = { ...mockValidIcToken, symbol: 'ckUSDC', decimals: 6 };

const order: OisyTradeOrderView = {
	id: 'o1',
	side: 'sell',
	base,
	quote,
	quantity: 10,
	price: 2.5,
	filledQuantity: 0,
	status: 'Open'
};

describe('OisyTradeActiveOrders', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		activeOrdersMock.set([]);
		hasAssetsMock.set(false);
		pairsMock.set([]);
	});

	it('shows the deposit-first empty copy when the user has no deposits', () => {
		const { getByText } = render(OisyTradeActiveOrders);

		expect(getByText(en.trading.orders.empty_active)).toBeInTheDocument();
		expect(getByText(en.trading.page.active_orders_empty_deposit)).toBeInTheDocument();
	});

	it('shows the place-an-order empty copy once the user has deposits', () => {
		hasAssetsMock.set(true);

		const { getByText } = render(OisyTradeActiveOrders);

		expect(getByText(en.trading.page.active_orders_empty_place)).toBeInTheDocument();
	});

	it('renders the section title and a row per active order', () => {
		activeOrdersMock.set([order]);

		const { getByText, container } = render(OisyTradeActiveOrders);

		expect(getByText(en.trading.page.active_orders)).toBeInTheDocument();
		expect(container).toHaveTextContent('Sell');
		expect(container).toHaveTextContent('Open');
	});

	it('opens the limit-order modal when New order is clicked and the user has deposits', async () => {
		hasAssetsMock.set(true);
		const openSpy = vi.spyOn(modalStore, 'openLimitOrder').mockImplementation(() => {});

		const { getByRole } = render(OisyTradeActiveOrders);

		await fireEvent.click(getByRole('button', { name: en.trading.page.new_order }));

		expect(openSpy).toHaveBeenCalled();
	});

	it('disables the New order button when the user has no deposits', () => {
		// The disabled button is wrapped in a tooltip span (also role=button), so
		// target the actual <button> via its label text.
		const { getByText } = render(OisyTradeActiveOrders);

		expect(getByText(en.trading.page.new_order).closest('button')).toBeDisabled();
	});
});
