import BorrowingsList from '$lib/components/borrowings/BorrowingsList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('BorrowingsList', () => {
	const borrowReserve: LiquidiumReserve = {
		poolId: 'pool-usdc',
		asset: 'USDC',
		chain: 'ETH',
		supplyApy: 0,
		borrowApy: 7,
		deposited: ZERO,
		depositedDecimals: 6,
		borrowed: 20_000_000_000n,
		borrowedDecimals: 6,
		suppliedUsd: 0,
		borrowedUsd: 20_000
	};

	const supplyReserve: LiquidiumReserve = {
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
	};

	const portfolio = (reserves: LiquidiumReserve[]): LiquidiumPortfolio => ({
		reserves,
		totalSuppliedUsd: 0,
		totalBorrowedUsd: 0,
		netValueUsd: 0,
		availableBorrowsUsd: 0,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 73
	});

	beforeEach(() => {
		liquidiumStore.reset();
	});

	it('lists borrow positions', () => {
		liquidiumStore.set({ markets: [], portfolio: portfolio([borrowReserve]), assetPrices: {} });

		const { container } = render(BorrowingsList);

		expect(container).toHaveTextContent('USDC');
		expect(container).toHaveTextContent(en.liquidium.text.borrow_rate);
		expect(container).not.toHaveTextContent(en.borrowings.text.no_borrowings);
	});

	it('ignores supplied-only reserves and shows the empty state', () => {
		liquidiumStore.set({ markets: [], portfolio: portfolio([supplyReserve]), assetPrices: {} });

		const { container } = render(BorrowingsList);

		expect(container).toHaveTextContent(en.borrowings.text.no_borrowings);
		expect(container).not.toHaveTextContent('BTC');
	});

	it('shows the empty state when there is no portfolio', () => {
		liquidiumStore.set({ markets: [], portfolio: null, assetPrices: {} });

		const { container } = render(BorrowingsList);

		expect(container).toHaveTextContent(en.borrowings.text.no_borrowings);
	});
});
