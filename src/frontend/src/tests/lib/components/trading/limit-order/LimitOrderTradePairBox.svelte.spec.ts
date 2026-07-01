import LimitOrderTradePairBox from '$lib/components/trading/limit-order/LimitOrderTradePairBox.svelte';
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
		baseExchangeRate: 10,
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
		const { container } = render(LimitOrderTradePairBox, { props: { ...baseProps } });

		expect(container).toHaveTextContent(en.trading.limit_order.you_sell);
		expect(container).toHaveTextContent(en.trading.limit_order.you_get_at_least);
		// 4 * 12 = 48.
		expect(container).toHaveTextContent('48');
	});

	it('renders the buy labels', () => {
		const { container } = render(LimitOrderTradePairBox, {
			props: { ...baseProps, side: 'buy' }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.you_buy);
		expect(container).toHaveTextContent(en.trading.limit_order.you_pay_at_most);
	});

	it('renders the quote token pill with the quote symbol', () => {
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

	it('invokes onSelectQuote when the quote pill is clicked', async () => {
		const onSelectQuote = vi.fn();

		const { getByText } = render(LimitOrderTradePairBox, {
			props: { ...baseProps, onSelectQuote }
		});

		await fireEvent.click(getByText('ckUSDC'));

		expect(onSelectQuote).toHaveBeenCalledOnce();
	});
});
