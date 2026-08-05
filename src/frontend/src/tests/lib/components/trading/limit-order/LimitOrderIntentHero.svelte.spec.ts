import type { IcToken } from '$icp/types/ic-token';
import LimitOrderIntentHero from '$lib/components/trading/limit-order/LimitOrderIntentHero.svelte';
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

	it('shows fiat lines only when an exchange rate is known', () => {
		const { container, rerender } = render(LimitOrderIntentHero, {
			props: { side: 'sell', ...baseProps }
		});

		expect(container).not.toHaveTextContent('$19.00');

		rerender({ side: 'sell', ...baseProps, baseExchangeRate: 1.9, quoteExchangeRate: 0.756 });

		expect(container).toHaveTextContent('$19.00');
		expect(container).toHaveTextContent('$18.90');
	});
});
