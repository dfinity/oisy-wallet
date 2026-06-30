import LiquidiumProvider from '$lib/components/liquidium/LiquidiumProvider.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	afterNavigate: vi.fn()
}));

// Force the feature flags on (off by default outside staging) so the page renders.
vi.mock('$env/lend-borrow', () => ({
	LEND_BORROW_ENABLED: true,
	anyLendBorrowProviderEnabled: true
}));
vi.mock('$env/liquidium', () => ({ LIQUIDIUM_ENABLED: true }));

// Keep the IntervalLoader's onLoad a no-op so it doesn't reset the store we seed.
vi.mock('$lib/services/liquidium.services', () => ({
	loadLiquidium: vi.fn().mockResolvedValue(undefined)
}));

describe('LiquidiumProvider', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [
			{
				poolId: 'pool-btc',
				asset: 'BTC',
				chain: 'BTC',
				supplyApy: 5,
				borrowApy: 0,
				deposited: 100_000_000n,
				depositedDecimals: 8,
				borrowed: ZERO,
				borrowedDecimals: 8,
				suppliedUsd: 1000,
				borrowedUsd: 0
			}
		],
		totalSuppliedUsd: 1000,
		totalBorrowedUsd: 0,
		netValueUsd: 1000,
		availableBorrowsUsd: 0,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 73
	};

	beforeEach(() => {
		liquidiumStore.reset();
	});

	it('renders the markets and the positions section when data is present', () => {
		liquidiumStore.set({ markets: [market], portfolio, assetPrices: {} });

		const { container } = render(LiquidiumProvider);

		expect(container).toHaveTextContent(en.liquidium.text.health_factor);
		expect(container).toHaveTextContent(en.liquidium.text.supplied);
		expect(container).toHaveTextContent(en.liquidium.text.markets);
		expect(container).toHaveTextContent('BTC');
	});

	it('hides the positions section when there are no reserves', () => {
		liquidiumStore.set({ markets: [market], portfolio: null, assetPrices: {} });

		const { container } = render(LiquidiumProvider);

		expect(container).toHaveTextContent(en.liquidium.text.markets);
		expect(container).not.toHaveTextContent(en.liquidium.text.supplied);
	});
});
