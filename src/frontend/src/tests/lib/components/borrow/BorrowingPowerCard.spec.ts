import BorrowingPowerCard from '$lib/components/borrow/BorrowingPowerCard.svelte';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumPortfolio } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BorrowingPowerCard', () => {
	const portfolio: LiquidiumPortfolio = {
		reserves: [],
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

	it('reads as "available" when there is no debt', () => {
		const { container } = render(BorrowingPowerCard);

		expect(container).toHaveTextContent(en.borrow.text.borrowing_potential);
		expect(container).toHaveTextContent(en.borrow.text.available_best_provider);
		expect(container).not.toHaveTextContent(en.borrow.text.remaining_best_provider);
	});

	it('reads as "remaining" when there is open debt', () => {
		liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

		const { container } = render(BorrowingPowerCard);

		expect(container).toHaveTextContent(en.borrow.text.remaining_best_provider);
	});
});
