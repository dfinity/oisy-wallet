import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import OisyTradeOrderRow from '$lib/components/trading/OisyTradeOrderRow.svelte';
import { modalStore } from '$lib/stores/modal.store';
import type { OisyTradeOrderBook, OisyTradeOrderView } from '$lib/types/oisy-trade';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

// A single ICP/ckUSDC pair so the row can resolve tick size / decimals for queue position.
vi.mock('$lib/derived/oisy-trade.derived', async () => {
	const { writable } = await import('svelte/store');
	const { Principal } = await import('@dfinity/principal');
	const pair: TradingPairInfo = {
		status: { Trading: null },
		base: {
			id: { ledger_id: Principal.fromText('aaaaa-aa') },
			metadata: { symbol: 'ICP', decimals: 8 }
		},
		quote: {
			id: { ledger_id: Principal.fromText('aaaaa-aa') },
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

// Half the ask volume (the 2.4 level) is priced better than the 2.5 sell price.
const bookWithVolumeAhead: OisyTradeOrderBook = {
	ticker: { ask: [], bid: [] },
	depth: {
		asks: [
			{ price: 2_400_000n, quantity: 500_000_000n },
			{ price: 2_600_000n, quantity: 500_000_000n }
		],
		bids: []
	}
};

// Typographic minus (U+2212) used for the signed base/quote legs.
const MINUS = '−';

describe('OisyTradeOrderRow', () => {
	beforeEach(() => {
		setPrivacyMode({ enabled: false });
	});

	it('renders the intent line with the side word, base symbol, limit price and status pill', () => {
		const { container } = render(OisyTradeOrderRow, { props: { order } });

		expect(container).toHaveTextContent('Sell');
		expect(container).toHaveTextContent('ICP');
		// No inline quantity, "@" (not "at") before the limit price.
		expect(container).toHaveTextContent('for ckUSDC @');
		expect(container).not.toHaveTextContent(' at ');
		expect(container).toHaveTextContent('Open');
	});

	it('reads "with" for a buy order', () => {
		const { container } = render(OisyTradeOrderRow, {
			props: { order: { ...order, side: 'buy' } }
		});

		expect(container).toHaveTextContent('Buy');
		expect(container).toHaveTextContent('with ckUSDC @');
	});

	it('shows the base leaving (−) and the quote arriving (+) on a sell', () => {
		const { container } = render(OisyTradeOrderRow, { props: { order } });

		// Sell 10 ICP @ 2.5 → −10 ICP given, +25 ckUSDC received.
		expect(container).toHaveTextContent(`${MINUS}10 ICP`);
		expect(container).toHaveTextContent('+25 ckUSDC');
	});

	it('flips the signed legs on a buy', () => {
		const { container } = render(OisyTradeOrderRow, {
			props: { order: { ...order, side: 'buy' } }
		});

		expect(container).toHaveTextContent('+10 ICP');
		expect(container).toHaveTextContent(`${MINUS}25 ckUSDC`);
	});

	it('does not render the provider tag (it is the venue’s own page)', () => {
		const { queryByText } = render(OisyTradeOrderRow, { props: { order } });

		expect(queryByText('OISY TRADE')).toBeNull();
	});

	it('opens the order-detail modal with the order on click', async () => {
		const openSpy = vi.spyOn(modalStore, 'openOisyTradeOrderDetail');

		const { container } = render(OisyTradeOrderRow, { props: { order } });

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ data: order }));
	});

	it('shows the queue position when there is volume ahead', () => {
		const { container } = render(OisyTradeOrderRow, {
			props: { order, orderBook: bookWithVolumeAhead }
		});

		expect(container).toHaveTextContent('50% ahead in queue');
	});

	it('masks the intent line and amounts under privacy mode while keeping the status pill', () => {
		setPrivacyMode({ enabled: true });

		const { container } = render(OisyTradeOrderRow, { props: { order } });

		expect(container).not.toHaveTextContent('Sell');
		expect(container).not.toHaveTextContent('ICP');
		expect(container).toHaveTextContent('Open');
	});
});
