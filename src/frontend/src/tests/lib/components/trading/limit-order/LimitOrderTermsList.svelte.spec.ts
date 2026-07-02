import LimitOrderTermsList from '$lib/components/trading/limit-order/LimitOrderTermsList.svelte';
import { render } from '@testing-library/svelte';

describe('LimitOrderTermsList', () => {
	it('renders the DEX, order type and maker/taker fees', () => {
		const { container } = render(LimitOrderTermsList, {
			props: { orderTypeLabel: 'Good until canceled', makerFee: 0, takerFee: 0.2 }
		});

		expect(container).toHaveTextContent('OISY TRADE');
		expect(container).toHaveTextContent('Good until canceled');
		// maker 0 → "no fee" copy, taker 0.2 → percentage
		expect(container).toHaveTextContent('0.2');
	});

	it('shows a single taker fee for fill-or-kill', () => {
		const { container } = render(LimitOrderTermsList, {
			props: { orderTypeLabel: 'Fill or kill', makerFee: 0.1, takerFee: 0.2, takerOnly: true }
		});

		expect(container).toHaveTextContent('0.2');
		expect(container).not.toHaveTextContent('0.1');
	});

	it('renders "-" for unknown fees', () => {
		const { container } = render(LimitOrderTermsList, {
			props: { orderTypeLabel: 'Good until canceled', makerFee: null, takerFee: null }
		});

		expect(container).toHaveTextContent('-');
	});
});
