import Borrow from '$lib/components/borrow/Borrow.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => mockGoto(...args),
	afterNavigate: vi.fn()
}));

// Force the feature flags on (off by default outside staging) so the page renders.
vi.mock('$env/lend-borrow', () => ({
	LEND_BORROW_ENABLED: true,
	anyLendBorrowProviderEnabled: true
}));

vi.mock('$lib/services/analytics.services', () => ({ trackEvent: vi.fn() }));

describe('Borrow', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-eth',
		asset: 'USDC',
		chain: 'ETH',
		supplyApy: 3,
		borrowApy: 4,
		frozen: false,
		available: true
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [
			{
				poolId: 'pool-eth',
				asset: 'USDC',
				chain: 'ETH',
				supplyApy: 0,
				borrowApy: 8,
				deposited: ZERO,
				depositedDecimals: 6,
				borrowed: 1_000n,
				borrowedDecimals: 6,
				suppliedUsd: 0,
				borrowedUsd: 2000
			}
		],
		totalSuppliedUsd: 5000,
		totalBorrowedUsd: 2000,
		netValueUsd: 3000,
		availableBorrowsUsd: 1500,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 60
	};

	beforeEach(() => {
		mockGoto.mockClear();
		liquidiumStore.reset();
	});

	it('renders the header, borrowing options and the Liquidium card', () => {
		liquidiumStore.set({ markets: [market], portfolio, assetPrices: {} });

		const { container } = render(Borrow);

		expect(container).toHaveTextContent(en.borrow.text.header_title);
		expect(container).toHaveTextContent(en.borrow.text.borrowing_options);
		expect(container).toHaveTextContent(en.borrow.cards.liquidium.title);
		expect(container).toHaveTextContent(en.borrow.text.borrow_apr_from);
	});

	it('shows the cost rows only when there is open debt', () => {
		liquidiumStore.set({ markets: [market], portfolio, assetPrices: {} });

		const { container } = render(Borrow);

		expect(container).toHaveTextContent(en.earning.card_fields.currentBorrowing);
		expect(container).toHaveTextContent(en.earning.card_fields.interestPerYear);
	});

	it('hides the cost rows when there is no position', () => {
		liquidiumStore.set({ markets: [market], portfolio: null, assetPrices: {} });

		const { container } = render(Borrow);

		expect(container).not.toHaveTextContent(en.earning.card_fields.currentBorrowing);
		expect(container).not.toHaveTextContent(en.earning.card_fields.interestPerYear);
	});
});
