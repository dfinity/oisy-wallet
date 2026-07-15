import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingOrderRow from '$lib/components/trading/TradingOrderRow.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { modalStore } from '$lib/stores/modal.store';
import type { OisyTradeOrderBook, OisyTradeOrderView } from '$lib/types/oisy-trade';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

// A single ICP/ckUSDC pair so the row can resolve tick size / decimals for its order.
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
	status: 'Open',
	createdAt: ZERO
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

// No ask volume priced better than the order → front of book (0%).
const bookFrontOfBook: OisyTradeOrderBook = {
	ticker: { ask: [], bid: [] },
	depth: { asks: [{ price: 2_600_000n, quantity: 500_000_000n }], bids: [] }
};

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

	it('renders the provider tag inline within the order intent text block', () => {
		const { getByText } = render(TradingOrderRow, { props: { order } });

		// The side label, order text and provider tag share one text block so the
		// tag wraps with the text instead of dropping to its own flex line.
		const textBlock = getByText('Sell').parentElement;

		expect(textBlock).toHaveTextContent('OISY Trade');
	});

	it('opens the order-detail modal with the order on click', async () => {
		const openSpy = vi.spyOn(modalStore, 'openOisyTradeOrderDetail');

		const { container } = render(TradingOrderRow, { props: { order } });

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ data: order }));
	});

	// The status label span sits alongside its optional leading glyph inside the badge;
	// its parent is the flex wrapper that holds both.
	const badgeGlyphWrapper = ({
		getByText,
		label
	}: {
		getByText: (text: string) => HTMLElement;
		label: string;
	}) => getByText(label).parentElement;

	it.each([
		{ status: 'Filled' as const, label: 'Filled' },
		{ status: 'Canceled' as const, label: 'Canceled' },
		{ status: 'Expired' as const, label: 'Expired' }
	])('renders a leading SVG glyph for the $status badge', ({ status, label }) => {
		const { getByText } = render(TradingOrderRow, { props: { order: { ...order, status } } });

		expect(badgeGlyphWrapper({ getByText, label })?.querySelector('svg')).not.toBeNull();
	});

	it('renders no leading glyph for an active (Open) badge', () => {
		const { getByText } = render(TradingOrderRow, { props: { order } });

		expect(badgeGlyphWrapper({ getByText, label: 'Open' })?.querySelector('svg')).toBeNull();
	});

	it('shows the queue position under the status when there is volume ahead', () => {
		const { container } = render(TradingOrderRow, {
			props: { order, orderBook: bookWithVolumeAhead }
		});

		expect(container).toHaveTextContent('50% are ahead');
	});

	it('shows no queue position for a front-of-book active order', () => {
		const { container } = render(TradingOrderRow, {
			props: { order, orderBook: bookFrontOfBook }
		});

		expect(container).not.toHaveTextContent('are ahead');
	});

	it('shows no queue position for a terminal (history) order', () => {
		const { container } = render(TradingOrderRow, {
			props: { order: { ...order, status: 'Filled' }, orderBook: bookWithVolumeAhead }
		});

		expect(container).not.toHaveTextContent('are ahead');
	});
});
