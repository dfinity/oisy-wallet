import ActiveLoansCard from '$lib/components/borrow/ActiveLoansCard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumPortfolio } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('ActiveLoansCard', () => {
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
		liquidiumStore.reset();
	});

	it('shows the empty state and no health factor when there is no debt', () => {
		const { container } = render(ActiveLoansCard);

		expect(container).toHaveTextContent(en.borrow.text.active_loans);
		expect(container).toHaveTextContent(en.borrow.text.no_active_loans);
		expect(container).not.toHaveTextContent(en.liquidium.text.health_factor);
	});

	it('shows the debt total and the health factor when there is open debt', () => {
		liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

		const { container } = render(ActiveLoansCard);

		expect(container).toHaveTextContent(en.liquidium.text.health_factor);
		expect(container).not.toHaveTextContent(en.borrow.text.no_active_loans);
		expect(container).toHaveTextContent(en.borrow.text.apr);
	});

	it('hides the health factor when showHealthFactor is false', () => {
		liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

		const { container } = render(ActiveLoansCard, { props: { showHealthFactor: false } });

		expect(container).not.toHaveTextContent(en.liquidium.text.health_factor);
		expect(container).toHaveTextContent(en.borrow.text.apr);
	});
});
