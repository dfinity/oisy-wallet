import type { PriceLevel, TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingOrderRow from '$lib/components/trading/TradingOrderRow.svelte';
import { loadOrderBook } from '$lib/services/oisy-trade.services';
import { modalStore } from '$lib/stores/modal.store';
import type { OisyTradeOrderView } from '$lib/types/oisy-trade';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOrderBook: vi.fn(() => Promise.resolve(undefined))
}));

// A single ICP/ckUSDC pair so the row can resolve the order book for its order.
vi.mock('$lib/derived/oisy-trade.derived', async () => {
	const { writable } = await import('svelte/store');
	const { Principal: P } = await import('@dfinity/principal');
	const pair: TradingPairInfo = {
		status: { Trading: null },
		base: { id: { ledger_id: P.fromText('aaaaa-aa') }, metadata: { symbol: 'ICP', decimals: 8 } },
		quote: {
			id: { ledger_id: P.fromText('aaaaa-aa') },
			metadata: { symbol: 'ckUSDC', decimals: 6 }
		},
		min_notional: 1_000_000n,
		lot_size: 100_000_000n,
		taker_fee_bps: 0,
		maker_fee_bps: 0,
		tick_size: 10_000n,
		max_notional: []
	};
	return { oisyTradePairs: writable([pair]) };
});

const base: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8 };
const quote: IcToken = { ...mockValidIcToken, symbol: 'ckUSDC', decimals: 6 };

const order: OisyTradeOrderView = {
	id: 'order-1',
	side: 'sell',
	base,
	quote,
	quantity: 10,
	price: 2.5,
	filledQuantity: 0,
	status: 'Open'
};

const level = (price: bigint, quantity: bigint): PriceLevel => ({ price, quantity });

describe('TradingOrderRow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
	});

	it('renders the order intent and status pill', () => {
		const { container } = render(TradingOrderRow, { props: { order } });

		// Sell intent (side label + base symbol) and the Open status pill.
		expect(container).toHaveTextContent('Sell');
		expect(container).toHaveTextContent('ICP');
		expect(container).toHaveTextContent('Open');
	});

	it('opens the order-detail modal with the order on click', async () => {
		const openSpy = vi.spyOn(modalStore, 'openOisyTradeOrderDetail');

		const { container } = render(TradingOrderRow, { props: { order } });

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ data: order }));
	});

	it('shows the queue position under the status for an active order with volume ahead', async () => {
		// Half the same-side (ask) volume is priced better than the 2.5 sell price.
		vi.mocked(loadOrderBook).mockResolvedValue({
			ticker: { ask: [], bid: [] },
			depth: {
				asks: [level(2_400_000n, 500_000_000n), level(2_600_000n, 500_000_000n)],
				bids: []
			}
		});

		const { container } = render(TradingOrderRow, { props: { order } });

		await waitFor(() => expect(container).toHaveTextContent('50% are ahead'));
	});

	it('shows no queue position for a front-of-book active order', async () => {
		// No ask volume priced better than the order → front of book (0%).
		vi.mocked(loadOrderBook).mockResolvedValue({
			ticker: { ask: [], bid: [] },
			depth: { asks: [level(2_600_000n, 500_000_000n)], bids: [] }
		});

		const { container } = render(TradingOrderRow, { props: { order } });

		await waitFor(() => expect(loadOrderBook).toHaveBeenCalled());
		expect(container).not.toHaveTextContent('are ahead');
	});

	it('shows no queue position for a terminal (history) order', async () => {
		vi.mocked(loadOrderBook).mockResolvedValue({
			ticker: { ask: [], bid: [] },
			depth: {
				asks: [level(2_400_000n, 500_000_000n), level(2_600_000n, 500_000_000n)],
				bids: []
			}
		});

		const { container } = render(TradingOrderRow, {
			props: { order: { ...order, status: 'Filled' } }
		});

		// Terminal rows never load or show queue position.
		expect(loadOrderBook).not.toHaveBeenCalled();
		expect(container).not.toHaveTextContent('are ahead');
	});
});
