import LimitOrderForm from '$lib/components/trading/limit-order/LimitOrderForm.svelte';
import type { LimitOrderPairView, LimitOrderSide } from '$lib/utils/oisy-trade.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

const { mockFreeBalance, mockIcTokenBySymbol, mockExchanges } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		mockFreeBalance: writable({}),
		mockIcTokenBySymbol: writable({}),
		mockExchanges: writable({})
	};
});

vi.mock('$lib/derived/oisy-trade.derived', () => ({
	oisyTradeFreeBalanceBySymbol: mockFreeBalance,
	oisyTradeIcTokenBySymbol: mockIcTokenBySymbol
}));

vi.mock('$lib/derived/exchange.derived', () => ({
	exchanges: mockExchanges
}));

describe('LimitOrderForm', () => {
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

	const baseProps = {
		side: 'sell' as LimitOrderSide,
		baseSymbol: 'ICP',
		quoteSymbol: 'ckUSDC',
		baseAmount: '4',
		price: '12',
		fillOrKill: false,
		activePreset: null,
		pairView,
		currentValue: 10,
		bid: 10,
		ask: 11,
		depthLevels: { asks: [{ price: 11, quantity: 5 }], bids: [{ price: 10, quantity: 5 }] },
		onSelectBase: () => {},
		onSelectQuote: () => {},
		onClose: () => {},
		onReview: () => {}
	};

	beforeEach(() => {
		mockFreeBalance.set({ ICP: 100, ckUSDC: 1000 });
		mockIcTokenBySymbol.set({ ICP: { ...mockValidIcToken, symbol: 'ICP', id: Symbol('ICP') } });
		mockExchanges.set({});
	});

	it('renders the side control, review button and fill-or-kill toggle', () => {
		const { container } = render(LimitOrderForm, { props: { ...baseProps } });

		expect(container).toHaveTextContent(en.trading.limit_order.review_button);
		expect(container).toHaveTextContent(en.trading.limit_order.fok_title);
	});

	it('enables the review button for a valid order', () => {
		const { getByText } = render(LimitOrderForm, { props: { ...baseProps } });

		const reviewButton = getByText(en.trading.limit_order.review_button).closest(
			'button'
		) as HTMLButtonElement;

		expect(reviewButton).not.toBeDisabled();
	});

	it('disables the review button when there is no pair view', () => {
		const { getByText } = render(LimitOrderForm, {
			props: { ...baseProps, pairView: undefined }
		});

		const reviewButton = getByText(en.trading.limit_order.review_button).closest(
			'button'
		) as HTMLButtonElement;

		expect(reviewButton).toBeDisabled();
	});

	it('invokes onReview when the enabled review button is clicked', async () => {
		const onReview = vi.fn();

		const { getByText } = render(LimitOrderForm, {
			props: { ...baseProps, onReview }
		});

		await fireEvent.click(getByText(en.trading.limit_order.review_button));

		expect(onReview).toHaveBeenCalledOnce();
	});

	it('toggles the fill-or-kill help text when the info button is clicked', async () => {
		const { container, queryByText, getByText } = render(LimitOrderForm, {
			props: { ...baseProps }
		});

		expect(queryByText(en.trading.limit_order.fok_help)).toBeNull();

		const infoButton = container.querySelector(
			`button[aria-label="${en.trading.limit_order.fok_title}"]`
		) as HTMLButtonElement;

		await fireEvent.click(infoButton);

		expect(getByText(en.trading.limit_order.fok_help)).toBeInTheDocument();
	});

	it('updates the bound side when the buy control is clicked', async () => {
		const props = $state({ ...baseProps });

		const { getByText } = render(LimitOrderForm, { props });

		await fireEvent.click(getByText(en.trading.limit_order.buy));

		expect(props.side).toBe('buy');
	});
});
