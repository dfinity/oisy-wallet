import type { IcToken } from '$icp/types/ic-token';
import LimitOrderIntentHero from '$lib/components/trading/limit-order/LimitOrderIntentHero.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('LimitOrderIntentHero', () => {
	const baseToken: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8 };
	const quoteToken: IcToken = { ...mockValidIcToken, symbol: 'ckUSDC', decimals: 6 };

	const baseProps = {
		baseAmount: '10',
		baseToken,
		quoteAmount: '25',
		quoteToken
	};

	it('renders a sell intent with both legs', () => {
		const { container } = render(LimitOrderIntentHero, { props: { side: 'sell', ...baseProps } });

		expect(container).toHaveTextContent('Sell');
		expect(container).toHaveTextContent('10 ICP');
		expect(container).toHaveTextContent('25 ckUSDC');
	});

	it('renders a buy intent', () => {
		const { container } = render(LimitOrderIntentHero, { props: { side: 'buy', ...baseProps } });

		expect(container).toHaveTextContent('Buy');
	});

	// The order's price is spelled out by the rows under the hero, so neither leg
	// carries a fiat line — and no "exchange rate unavailable" fallback in its place.
	it('renders no fiat line on either leg', () => {
		const { container } = render(LimitOrderIntentHero, { props: { side: 'sell', ...baseProps } });

		expect(container).not.toHaveTextContent('$');
		expect(container).not.toHaveTextContent(en.tokens.text.exchange_is_not_available);
	});
});
