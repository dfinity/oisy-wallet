import LimitOrderRouting from '$lib/components/trading/limit-order/LimitOrderRouting.svelte';
import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
import type { LimitOrderPairView } from '$lib/utils/oisy-trade.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('LimitOrderRouting', () => {
	const pairView: LimitOrderPairView = {
		baseSymbol: 'ICP',
		quoteSymbol: 'ckUSDC',
		baseDecimals: 8,
		quoteDecimals: 6,
		lotSize: 0.25,
		tickSize: 0.0005,
		minNotional: 1,
		maxNotional: null,
		makerFeeBps: 10,
		takerFeeBps: 20
	};

	const defaultProps = {
		pairView,
		bid: 9,
		ask: 11,
		fillOrKill: false
	};

	it('renders the provider name and best-execution tag', () => {
		const { container } = render(LimitOrderRouting, { props: defaultProps });

		expect(container).toHaveTextContent(OISY_TRADE_PROVIDER_NAME);
		expect(container).toHaveTextContent(en.trading.limit_order.routing_tag);
	});

	it('keeps the detail rows collapsed by default', () => {
		const { queryByText } = render(LimitOrderRouting, { props: defaultProps });

		expect(queryByText(en.trading.limit_order.lowest_ask)).toBeNull();
	});

	it('expands the detail rows when the header is clicked', async () => {
		const { container, getByText } = render(LimitOrderRouting, { props: defaultProps });

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(getByText(en.trading.limit_order.lowest_ask)).toBeInTheDocument();
		expect(getByText(en.trading.limit_order.highest_bid)).toBeInTheDocument();
		expect(getByText(en.trading.limit_order.spread)).toBeInTheDocument();
		// 9 / 11 → mid 10 → spread (11-9)/10 = 20.0%
		expect(container).toHaveTextContent('20.0%');
	});

	it('shows the maker fee row for a resting (non-FOK) order', async () => {
		const { container, getByText } = render(LimitOrderRouting, { props: defaultProps });

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(getByText(en.trading.limit_order.maker_fee)).toBeInTheDocument();
		expect(getByText(en.trading.limit_order.taker_fee)).toBeInTheDocument();
	});

	it('hides the maker fee row for a fill-or-kill order', async () => {
		const { container, queryByText, getByText } = render(LimitOrderRouting, {
			props: { ...defaultProps, fillOrKill: true }
		});

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(queryByText(en.trading.limit_order.maker_fee)).toBeNull();
		expect(getByText(en.trading.limit_order.taker_fee)).toBeInTheDocument();
	});

	it('renders plain-hyphen placeholders (never em-dashes) for bid/ask and spread when bid or ask is null', async () => {
		const { container, getAllByText } = render(LimitOrderRouting, {
			props: { ...defaultProps, bid: null, ask: null }
		});

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		// The three empty readouts (ask, bid, spread) each render a plain hyphen.
		expect(getAllByText('-')).toHaveLength(3);
		expect(container.textContent).not.toContain('—');
	});

	it('renders the no-fee label when fees are zero', async () => {
		const { container, getAllByText } = render(LimitOrderRouting, {
			props: {
				...defaultProps,
				pairView: { ...pairView, makerFeeBps: 0, takerFeeBps: 0 }
			}
		});

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(getAllByText(en.trading.limit_order.no_fee)).toHaveLength(2);
	});
});
