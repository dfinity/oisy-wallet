import LimitOrderTradePairBox from '$lib/components/trading/limit-order/LimitOrderTradePairBox.svelte';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { LimitOrderPairView, LimitOrderSide } from '$lib/utils/oisy-trade.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('LimitOrderTradePairBox', () => {
	const pairView: LimitOrderPairView = {
		baseSymbol: 'ICP',
		quoteSymbol: 'ckUSDC',
		baseDecimals: 8,
		quoteDecimals: 6,
		lotSize: 0.25,
		tickSize: 0.0005,
		minNotional: 1,
		maxNotional: 1000,
		makerFeeBps: 10,
		takerFeeBps: 20
	};

	const baseProps = {
		side: 'sell' as LimitOrderSide,
		baseSymbol: 'ICP',
		quoteSymbol: 'ckUSDC',
		baseToken: { ...mockValidIcToken, symbol: 'ICP' },
		quoteToken: { ...mockValidIcToken, symbol: 'ckUSDC' },
		baseExchangeRate: 10,
		quoteExchangeRate: 1,
		baseAmount: '4',
		price: '12',
		pairView,
		freeBase: 100,
		freeQuote: 1000,
		onSelectBase: () => {},
		onSelectQuote: () => {},
		onBaseInput: () => {},
		onMax: () => {}
	};

	it('renders the sell labels and the derived quote amount', () => {
		const { container, getAllByTestId } = render(LimitOrderTradePairBox, {
			props: { ...baseProps }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.you_sell);
		expect(container).toHaveTextContent(en.trading.limit_order.you_get_at_least);

		// The quote leg is a read-only, non-editable input; its value is the derived
		// amount (base × price = 4 × 12 = 48), not free text.
		const [, quoteInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

		expect(quoteInput).toHaveValue('48');
	});

	it('formats the read-only quote amount to the quote decimals (no float artifacts)', () => {
		// 0.1 * 3 = 0.30000000000000004 in raw float; the readout must round it.
		const { getAllByTestId } = render(LimitOrderTradePairBox, {
			props: { ...baseProps, baseAmount: '0.1', price: '3' }
		});

		const [, quoteInput] = getAllByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

		expect(quoteInput).toHaveValue('0.3');
	});

	it('renders the buy labels', () => {
		const { container } = render(LimitOrderTradePairBox, {
			props: { ...baseProps, side: 'buy' }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.you_buy);
		expect(container).toHaveTextContent(en.trading.limit_order.you_pay_at_most);
	});

	it('renders the quote token selector with the quote symbol', () => {
		const { container } = render(LimitOrderTradePairBox, { props: { ...baseProps } });

		expect(container).toHaveTextContent('ckUSDC');
	});

	it('renders a max button for the sell side and invokes onMax on click', async () => {
		const onMax = vi.fn();

		const { getByText } = render(LimitOrderTradePairBox, {
			props: { ...baseProps, onMax }
		});

		await fireEvent.click(getByText((text) => text.includes('Max') && text.includes('ICP')));

		expect(onMax).toHaveBeenCalledOnce();
	});

	it('shows the balance error when the sell amount exceeds the free balance', () => {
		const { container } = render(LimitOrderTradePairBox, {
			props: { ...baseProps, baseAmount: '200', freeBase: 100 }
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.trading.limit_order.error_balance_sell, {
				$amount: '100',
				$symbol: 'ICP'
			})
		);
	});

	it('shows the lot-multiple error when the amount is not a multiple of the lot size', () => {
		const { container } = render(LimitOrderTradePairBox, {
			props: { ...baseProps, baseAmount: '4.1' }
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.trading.limit_order.error_lot_multiple, {
				$step: '0.25',
				$symbol: 'ICP'
			})
		);
	});

	it('invokes onSelectQuote when the quote token selector is clicked', async () => {
		const onSelectQuote = vi.fn();

		const { getByText } = render(LimitOrderTradePairBox, {
			props: { ...baseProps, onSelectQuote }
		});

		await fireEvent.click(getByText('ckUSDC'));

		expect(onSelectQuote).toHaveBeenCalledOnce();
	});

	it('does not invoke onSelectQuote until a base token is picked', async () => {
		const onSelectQuote = vi.fn();

		// No base yet: the quote list is filtered by the base's markets, so the
		// quote selector must stay inert until a base is chosen.
		const { getAllByText } = render(LimitOrderTradePairBox, {
			props: {
				...baseProps,
				baseSymbol: undefined,
				baseToken: undefined,
				quoteSymbol: undefined,
				quoteToken: undefined,
				onSelectQuote
			}
		});

		// Both legs show "Select token" without a token; the quote one is second.
		const [, quoteSelect] = getAllByText(en.tokens.text.select_token);
		await fireEvent.click(quoteSelect);

		expect(onSelectQuote).not.toHaveBeenCalled();
	});
});
