import type { IcToken } from '$icp/types/ic-token';
import TradingOrderDetailModal from '$lib/components/trading/TradingOrderDetailModal.svelte';
import { TRADING_ORDER_DETAIL_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
import type { OisyTradeOrderStatus, OisyTradeOrderView } from '$lib/types/oisy-trade';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOrderBook: vi.fn(() => Promise.resolve(undefined)),
	loadOisyTrade: vi.fn(() => Promise.resolve(undefined)),
	cancelLimitOrder: vi.fn(() => Promise.resolve(undefined))
}));

vi.mock('$lib/derived/oisy-trade.derived', async () => {
	const { writable } = await import('svelte/store');
	return { oisyTradePairs: writable([]) };
});

const base: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8 };
const quote: IcToken = { ...mockValidIcToken, symbol: 'ckUSDC', decimals: 6 };

const buildOrder = (over: Partial<OisyTradeOrderView> = {}): OisyTradeOrderView => ({
	id: 'order-1',
	side: 'sell',
	base,
	quote,
	quantity: 10,
	price: 2.5,
	filledQuantity: 0,
	status: 'Open' as OisyTradeOrderStatus,
	...over
});

describe('TradingOrderDetailModal', () => {
	it('renders the detail title, status pill and the order terms', () => {
		const { container } = render(TradingOrderDetailModal, { props: { order: buildOrder() } });

		expect(container).toHaveTextContent(en.trading.order_detail.title);
		expect(container).toHaveTextContent(en.trading.orders.status_open);
		expect(container).toHaveTextContent('ICP');
		expect(container).toHaveTextContent('ckUSDC');
	});

	it('shows the cancel action for an active order', () => {
		const { getByTestId } = render(TradingOrderDetailModal, {
			props: { order: buildOrder({ status: 'Open' }) }
		});

		expect(getByTestId(TRADING_ORDER_DETAIL_CANCEL_BUTTON)).toBeInTheDocument();
	});

	it('hides the cancel action for a terminal order', () => {
		const { queryByTestId } = render(TradingOrderDetailModal, {
			props: { order: buildOrder({ status: 'Filled' }) }
		});

		expect(queryByTestId(TRADING_ORDER_DETAIL_CANCEL_BUTTON)).toBeNull();
	});

	it('shows the filled-quantity row for a partially filled order', () => {
		const { container } = render(TradingOrderDetailModal, {
			props: { order: buildOrder({ status: 'Open', filledQuantity: 4 }) }
		});

		expect(container).toHaveTextContent(en.trading.order_detail.filled);
		expect(container).toHaveTextContent(en.trading.orders.status_partial);
	});

	it('shows the filled-quantity row for a cancelled order that had partly filled', () => {
		const { container } = render(TradingOrderDetailModal, {
			props: { order: buildOrder({ status: 'Canceled', filledQuantity: 4 }) }
		});

		expect(container).toHaveTextContent(en.trading.order_detail.filled);
	});
});
