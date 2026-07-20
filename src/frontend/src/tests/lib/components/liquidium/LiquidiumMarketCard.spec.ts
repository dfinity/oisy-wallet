import LiquidiumMarketCard from '$lib/components/liquidium/LiquidiumMarketCard.svelte';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
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

	it('renders the asset with supply and borrow rates', () => {
		const { container } = render(LiquidiumMarketCard, { props: { market: market() } });

		expect(container).toHaveTextContent('BTC');
		expect(container).toHaveTextContent(en.liquidium.text.supply_label);
		expect(container).toHaveTextContent(en.liquidium.text.borrow_label);
		expect(container).toHaveTextContent(`${formatStakeApyNumber(5)}%`);
		expect(container).toHaveTextContent(`${formatStakeApyNumber(9)}%`);
	});

	it('shows rates instead of "Coming soon" for an available market', () => {
		const { container } = render(LiquidiumMarketCard, { props: { market: market() } });

		expect(container).not.toHaveTextContent(en.liquidium.text.coming_soon_teaser);
	});

	it('shows "Coming soon" instead of rates for an unavailable market', () => {
		const { container } = render(LiquidiumMarketCard, {
			props: { market: market({ available: false }) }
		});

		expect(container).toHaveTextContent(en.liquidium.text.coming_soon_teaser);
		expect(container).not.toHaveTextContent(en.liquidium.text.supply_label);
	});

	it('renders an ICP-chain market with its rates', () => {
		const { container } = render(LiquidiumMarketCard, {
			props: { market: market({ poolId: 'pool-icp', asset: 'ICP', chain: 'ICP' }) }
		});

		expect(container).toHaveTextContent('ICP');
		expect(container).toHaveTextContent(en.liquidium.text.supply_label);
		expect(container).not.toHaveTextContent(en.liquidium.text.coming_soon_teaser);
	});
});
