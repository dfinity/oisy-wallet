import LiquidiumMarketCard from '$lib/components/liquidium/LiquidiumMarketCard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumMarket, LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
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

	const suppliedReserve = (poolId: string): LiquidiumReserve => ({
		poolId,
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		deposited: 100_000_000n,
		depositedDecimals: 8,
		borrowed: ZERO,
		borrowedDecimals: 8,
		suppliedUsd: 1000,
		borrowedUsd: 0
	});

	const borrowedReserve = (poolId: string): LiquidiumReserve => ({
		poolId,
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		deposited: ZERO,
		depositedDecimals: 8,
		borrowed: 1_000_000n,
		borrowedDecimals: 8,
		suppliedUsd: 0,
		borrowedUsd: 1000
	});

	const setPortfolio = (overrides: Partial<LiquidiumPortfolio> = {}) =>
		liquidiumStore.set({
			markets: [],
			assetPrices: {},
			portfolio: {
				reserves: [],
				totalSuppliedUsd: 1000,
				totalBorrowedUsd: 0,
				netValueUsd: 1000,
				availableBorrowsUsd: 700,
				weightedLiquidationThresholdBps: 8000,
				healthFactorPercent: 100,
				...overrides
			}
		});

	afterEach(() => {
		liquidiumStore.reset();
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

	describe('Borrow button gating', () => {
		it('is disabled when the user has no borrowing power', () => {
			const { getByRole } = render(LiquidiumMarketCard, { props: { market: market() } });

			expect(getByRole('button', { name: en.liquidium.text.action_borrow })).toBeDisabled();
		});

		it('is disabled for a token the user has already supplied', () => {
			setPortfolio({ reserves: [suppliedReserve('pool-btc')] });

			const { getByRole } = render(LiquidiumMarketCard, { props: { market: market() } });

			expect(getByRole('button', { name: en.liquidium.text.action_borrow })).toBeDisabled();
		});

		it('is enabled with borrowing power on a token the user has not supplied', () => {
			setPortfolio({ reserves: [suppliedReserve('pool-eth')] });

			const { getByRole } = render(LiquidiumMarketCard, { props: { market: market() } });

			expect(getByRole('button', { name: en.liquidium.text.action_borrow })).toBeEnabled();
		});

		it('is disabled when there is borrowing power but the token is supplied', () => {
			setPortfolio({ availableBorrowsUsd: 700, reserves: [suppliedReserve('pool-btc')] });

			const { getByRole } = render(LiquidiumMarketCard, { props: { market: market() } });

			expect(getByRole('button', { name: en.liquidium.text.action_borrow })).toBeDisabled();
		});
	});

	describe('Supply button gating', () => {
		it('is enabled by default', () => {
			const { getByRole } = render(LiquidiumMarketCard, { props: { market: market() } });

			expect(getByRole('button', { name: en.liquidium.text.action_supply })).toBeEnabled();
		});

		it('is disabled for a token the user has borrowed', () => {
			setPortfolio({ totalBorrowedUsd: 1000, reserves: [borrowedReserve('pool-btc')] });

			const { getByRole } = render(LiquidiumMarketCard, { props: { market: market() } });

			expect(getByRole('button', { name: en.liquidium.text.action_supply })).toBeDisabled();
		});

		it('stays enabled when only a different token is borrowed', () => {
			setPortfolio({ totalBorrowedUsd: 1000, reserves: [borrowedReserve('pool-eth')] });

			const { getByRole } = render(LiquidiumMarketCard, { props: { market: market() } });

			expect(getByRole('button', { name: en.liquidium.text.action_supply })).toBeEnabled();
		});
	});
});
