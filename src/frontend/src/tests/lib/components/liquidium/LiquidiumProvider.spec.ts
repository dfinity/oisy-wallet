import { replaceState } from '$app/navigation';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import LiquidiumProvider from '$lib/components/liquidium/LiquidiumProvider.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { enabledFungibleTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import { initialLoading } from '$lib/stores/loader.store';
import { modalStore } from '$lib/stores/modal.store';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	afterNavigate: vi.fn(),
	replaceState: vi.fn()
}));

// Force the provider flags on (off by default outside staging) so the page renders.
vi.mock('$env/lend-borrow', () => ({
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

	const pageUrl = 'https://oisy.com/providers/liquidium/';

	beforeEach(() => {
		vi.clearAllMocks();
		liquidiumStore.reset();
		modalStore.close();
		mockPage.mockUrl(new URL(pageUrl));
	});

	it('renders the markets and the positions section when data is present', () => {
		liquidiumStore.set({ markets: [market], portfolio, assetPrices: {} });

		const { container } = render(LiquidiumProvider);

		expect(container).toHaveTextContent(en.liquidium.text.total_supplied);
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

	describe('supply link', () => {
		const usdtMarket: LiquidiumMarket = {
			poolId: 'pool-usdt',
			asset: 'USDT',
			chain: 'ETH',
			supplyApy: 6.47,
			borrowApy: 9,
			frozen: false,
			available: true
		};

		beforeEach(() => {
			initialLoading.set(false);
			liquidiumStore.set({ markets: [market, usdtMarket], portfolio: null, assetPrices: {} });
			liquidiumStore.setLoaded(true);
		});

		afterEach(() => {
			initialLoading.set(true);
			balancesStore.reset(USDT_TOKEN.id);
			vi.restoreAllMocks();
		});

		it('opens the supply dialog and drops the link from the address', () => {
			mockPage.mockUrl(new URL(`${pageUrl}?supply=USDT&source=earn`));

			render(LiquidiumProvider);

			expect(get(modalStore)?.type).toBe('liquidium-supply');
			expect(replaceState).toHaveBeenCalledExactlyOnceWith(new URL(pageUrl), {});
		});

		it('waits for the markets to load', () => {
			liquidiumStore.setLoaded(false);
			mockPage.mockUrl(new URL(`${pageUrl}?supply=USDT&source=earn`));

			render(LiquidiumProvider);

			expect(get(modalStore)).toBeNull();
			expect(replaceState).not.toHaveBeenCalled();
		});

		it('does nothing without a supply link', () => {
			render(LiquidiumProvider);

			expect(get(modalStore)).toBeNull();
			expect(replaceState).not.toHaveBeenCalled();
		});

		it('opens the dialog on the picker when the user holds none of the asset', () => {
			mockPage.mockUrl(new URL(`${pageUrl}?supply=USDT&source=earn`));

			const { getByRole } = render(LiquidiumProvider);

			expect(getByRole('dialog')).toHaveTextContent(en.liquidium.text.select_supply_token);
		});

		it('opens the dialog on the amount when the user holds the asset', () => {
			vi.spyOn(enabledFungibleTokens, 'subscribe').mockImplementation((fn) => {
				fn([USDT_TOKEN]);
				return () => {};
			});
			balancesStore.set({ id: USDT_TOKEN.id, data: { data: 5_000_000n, certified: true } });
			mockPage.mockUrl(new URL(`${pageUrl}?supply=USDT&source=earn`));

			const { getByRole } = render(LiquidiumProvider);

			expect(getByRole('dialog')).not.toHaveTextContent(en.liquidium.text.select_supply_token);
			expect(getByRole('dialog')).toHaveTextContent(en.liquidium.text.action_supply);
		});
	});
});
