import LiquidiumMarketCard from '$lib/components/liquidium/LiquidiumMarketCard.svelte';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumMarketCard', () => {
	const market = (overrides: Partial<LiquidiumMarket> = {}): LiquidiumMarket => ({
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true,
		...overrides
	});

	it('renders the asset and supply/borrow labels', () => {
		const { container } = render(LiquidiumMarketCard, { props: { market: market() } });

		expect(container).toHaveTextContent('BTC');
		expect(container).toHaveTextContent(en.liquidium.text.supply_label);
		expect(container).toHaveTextContent(en.liquidium.text.borrow_label);
	});

	it('does not show "Coming soon" for an available market', () => {
		const { container } = render(LiquidiumMarketCard, { props: { market: market() } });

		expect(container).not.toHaveTextContent(en.liquidium.text.coming_soon);
	});

	it('shows "Coming soon" for an unavailable market', () => {
		const { container } = render(LiquidiumMarketCard, {
			props: { market: market({ available: false }) }
		});

		expect(container).toHaveTextContent(en.liquidium.text.coming_soon);
	});
});
