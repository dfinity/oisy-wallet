import type { IcToken } from '$icp/types/ic-token';
import OisyTradeOrderHistory from '$lib/components/trading/OisyTradeOrderHistory.svelte';
import type { OisyTradeOrderView } from '$lib/types/oisy-trade';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

const { historyOrdersMock } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return { historyOrdersMock: createWritable([]) };
});

vi.mock(import('$lib/derived/oisy-trade.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get oisyTradeHistoryOrders() {
		return historyOrdersMock;
	}
}));

const base: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8 };
const quote: IcToken = { ...mockValidIcToken, symbol: 'ckUSDC', decimals: 6 };

const order = (over: Partial<OisyTradeOrderView>): OisyTradeOrderView => ({
	id: 'h1',
	side: 'sell',
	base,
	quote,
	quantity: 10,
	price: 2.5,
	filledQuantity: 10,
	status: 'Filled',
	createdAt: 1_718_452_800_000_000_000n,
	...over
});

describe('OisyTradeOrderHistory', () => {
	beforeEach(() => {
		historyOrdersMock.set([]);
	});

	it('renders nothing when there is no history (hidden in Empty/Deposited states)', () => {
		const { queryByText } = render(OisyTradeOrderHistory);

		expect(queryByText(en.trading.page.order_history)).toBeNull();
	});

	it('renders the section, a row per order, and the terminal-status count', () => {
		historyOrdersMock.set([
			order({ id: 'h1', status: 'Filled' }),
			order({ id: 'h2', status: 'Canceled' })
		]);

		const { getByText } = render(OisyTradeOrderHistory);

		expect(getByText(en.trading.page.order_history)).toBeInTheDocument();
		expect(getByText('1 filled · 1 canceled')).toBeInTheDocument();
		// A row per order — each renders its terminal status pill.
		expect(getByText(en.trading.orders.status_filled)).toBeInTheDocument();
		expect(getByText(en.trading.orders.status_canceled)).toBeInTheDocument();
	});
});
