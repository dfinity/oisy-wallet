import type { IcToken } from '$icp/types/ic-token';
import LimitOrderReview from '$lib/components/trading/limit-order/LimitOrderReview.svelte';
import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
import type { LimitOrderPairView, LimitOrderSide } from '$lib/utils/oisy-trade.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

// The hero resolves each leg to its wallet token to render the logo and fiat
// line, so the review needs the symbol → token map the wizard would have loaded.
const { mockIcTokenBySymbol } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return { mockIcTokenBySymbol: writable({}) };
});

vi.mock('$lib/derived/oisy-trade.derived', () => ({
	oisyTradeIcTokenBySymbol: mockIcTokenBySymbol
}));

describe('LimitOrderReview', () => {
	beforeEach(() => {
		mockIcTokenBySymbol.set({
			ICP: { ...mockValidIcToken, symbol: 'ICP', decimals: 8 } as IcToken,
			ckUSDC: { ...mockValidIcToken, symbol: 'ckUSDC', decimals: 6 } as IcToken
		});
	});

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

	const depthLevels = {
		asks: [{ price: 11, quantity: 5 }],
		bids: [{ price: 10, quantity: 5 }]
	};

	const baseProps = {
		side: 'sell' as LimitOrderSide,
		pairView,
		baseAmount: 4,
		price: 12,
		currentValue: 10,
		bid: 10,
		ask: 11,
		fillOrKill: false,
		depthLevels,
		giveUpConfirmed: false,
		onBack: () => {},
		onPlace: () => {}
	};

	it('renders the base amount, derived quote amount and provider', () => {
		const { container } = render(LimitOrderReview, { props: { ...baseProps } });

		expect(container).toHaveTextContent('4 ICP');
		// 4 * 12 = 48 ckUSDC.
		expect(container).toHaveTextContent('48 ckUSDC');
		expect(container).toHaveTextContent(OISY_TRADE_PROVIDER_NAME);
	});

	it('renders the GTC order type for a resting order', () => {
		const { container } = render(LimitOrderReview, { props: { ...baseProps } });

		expect(container).toHaveTextContent(en.trading.limit_order.order_type_gtc);
	});

	it('renders the FOK order type and taker-only fee label for a fill-or-kill order', () => {
		const { container } = render(LimitOrderReview, {
			props: { ...baseProps, fillOrKill: true, price: 9 }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.order_type_fok);
		expect(container).toHaveTextContent(en.trading.limit_order.fee_taker);
	});

	it('shows the "you get at least" label for a sell', () => {
		const { container } = render(LimitOrderReview, { props: { ...baseProps } });

		expect(container).toHaveTextContent(en.trading.limit_order.you_get_at_least);
	});

	it('shows the "you pay at most" label for a buy', () => {
		const { container } = render(LimitOrderReview, {
			props: { ...baseProps, side: 'buy' }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.you_pay_at_most);
	});

	it('does not render the give-up confirmation for a non-severe order', () => {
		const { queryByText } = render(LimitOrderReview, { props: { ...baseProps } });

		expect(queryByText(en.trading.limit_order.give_up_confirm)).toBeNull();
	});

	it('renders the give-up confirmation when the order crosses with severe give-up', () => {
		// Sell crossing (price 5 below bid 10) and value diff < -5% → severe.
		const { getByText } = render(LimitOrderReview, {
			props: { ...baseProps, price: 5 }
		});

		expect(getByText(en.trading.limit_order.give_up_confirm)).toBeInTheDocument();
	});

	// A wide book (bid 8 / ask 11) around a current value of 10: a sell at 9 rests,
	// yet gives up 10% versus current value.
	const restingAgainstValue = { bid: 8, ask: 11, price: 9 };

	it('renders the resting confirmation, not the crossing one, for a severe resting sell', () => {
		const { getByText, queryByText } = render(LimitOrderReview, {
			props: { ...baseProps, ...restingAgainstValue }
		});

		expect(getByText(en.trading.limit_order.rests_against_value_confirm)).toBeInTheDocument();
		expect(queryByText(en.trading.limit_order.give_up_confirm)).toBeNull();
	});

	it('renders the resting confirmation for a severe resting buy', () => {
		const { getByText } = render(LimitOrderReview, {
			props: { ...baseProps, side: 'buy' as LimitOrderSide, bid: 8, ask: 12, price: 11 }
		});

		expect(getByText(en.trading.limit_order.rests_against_value_confirm)).toBeInTheDocument();
	});

	it('renders no confirmation for a resting order within the give-up threshold', () => {
		// -3% versus current value: warned on the form, but not blocking here.
		const { queryByText } = render(LimitOrderReview, {
			props: { ...baseProps, bid: 8, ask: 11, price: 9.7 }
		});

		expect(queryByText(en.trading.limit_order.rests_against_value_confirm)).toBeNull();
		expect(queryByText(en.trading.limit_order.give_up_confirm)).toBeNull();
	});

	it('disables the place button on a severe resting order until it is confirmed', async () => {
		const props = $state({ ...baseProps, ...restingAgainstValue });

		const { getByText } = render(LimitOrderReview, { props });

		const placeButton = getByText(en.trading.limit_order.place_order_button).closest(
			'button'
		) as HTMLButtonElement;

		expect(placeButton).toBeDisabled();

		props.giveUpConfirmed = true;
		await Promise.resolve();

		expect(placeButton).not.toBeDisabled();
	});

	it('invokes onBack when the back button is clicked', async () => {
		const onBack = vi.fn();

		const { getByText } = render(LimitOrderReview, {
			props: { ...baseProps, onBack }
		});

		await fireEvent.click(getByText(en.core.text.back));

		expect(onBack).toHaveBeenCalledOnce();
	});

	it('invokes onPlace when the place button is clicked on a non-severe order', async () => {
		const onPlace = vi.fn();

		const { getByText } = render(LimitOrderReview, {
			props: { ...baseProps, onPlace }
		});

		await fireEvent.click(getByText(en.trading.limit_order.place_order_button));

		expect(onPlace).toHaveBeenCalledOnce();
	});

	it('disables the place button on a severe order until the give-up is confirmed', async () => {
		const onPlace = vi.fn();
		const props = $state({ ...baseProps, price: 5, onPlace });

		const { getByText } = render(LimitOrderReview, { props });

		const placeButton = getByText(en.trading.limit_order.place_order_button).closest(
			'button'
		) as HTMLButtonElement;

		expect(placeButton).toBeDisabled();

		props.giveUpConfirmed = true;
		await Promise.resolve();

		expect(placeButton).not.toBeDisabled();
	});
});
