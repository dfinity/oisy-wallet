import LimitOrderIntentHero from '$lib/components/trading/limit-order/LimitOrderIntentHero.svelte';
import { render } from '@testing-library/svelte';

describe('LimitOrderIntentHero', () => {
	const baseProps = {
		baseAmount: '10',
		baseSymbol: 'ICP',
		quoteAmount: '25',
		quoteSymbol: 'ckUSDC'
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

	it('shows fiat lines only when provided', () => {
		const { container, rerender } = render(LimitOrderIntentHero, {
			props: { side: 'sell', ...baseProps }
		});

		expect(container).not.toHaveTextContent('$19.00');

		rerender({ side: 'sell', ...baseProps, baseFiat: '$19.00', quoteFiat: '$18.90' });

		expect(container).toHaveTextContent('$19.00');
		expect(container).toHaveTextContent('$18.90');
	});
});
