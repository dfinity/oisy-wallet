import LiquidiumSummary from '$lib/components/liquidium/LiquidiumSummary.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumPortfolio } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumSummary', () => {
	const portfolio: LiquidiumPortfolio = {
		reserves: [
			{
				poolId: 'pool-btc',
				asset: 'BTC',
				chain: 'BTC',
				supplyApy: 5,
				borrowApy: 0,
				deposited: ZERO,
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

	it('renders the total supplied, active loans and net value blocks', () => {
		const { container } = render(LiquidiumSummary, { props: { portfolio } });

		expect(container).toHaveTextContent(en.liquidium.text.total_supplied);
		expect(container).toHaveTextContent(en.borrow.text.active_loans);
		expect(container).toHaveTextContent(en.liquidium.text.net_value);
	});

	it('labels the yearly supply earnings with the APY suffix', () => {
		const { container } = render(LiquidiumSummary, { props: { portfolio } });

		expect(container).toHaveTextContent(en.liquidium.text.apy_suffix);
	});

	it('still renders the block labels when there is no portfolio', () => {
		const { container } = render(LiquidiumSummary, { props: { portfolio: null } });

		expect(container).toHaveTextContent(en.liquidium.text.total_supplied);
		expect(container).toHaveTextContent(en.liquidium.text.net_value);
	});

	it('signs the net interest from net interest, not net value', () => {
		const netNegative: LiquidiumPortfolio = {
			...portfolio,
			reserves: [
				{ ...portfolio.reserves[0], suppliedUsd: 1000, supplyApy: 1 },
				{
					...portfolio.reserves[0],
					poolId: 'pool-eth',
					suppliedUsd: 0,
					borrowedUsd: 1000,
					borrowApy: 5
				}
			],
			totalSuppliedUsd: 1000,
			totalBorrowedUsd: 1000,
			// Positive on purpose: the sign must follow net interest, not this.
			netValueUsd: 200
		};

		const { container } = render(LiquidiumSummary, { props: { portfolio: netNegative } });

		// Net interest = (1000·1 − 1000·5) / 100 = −$40/yr.
		expect(container).toHaveTextContent('−$40.00');
		expect(container).not.toHaveTextContent('+$40.00');
	});

	it('hides the health factor bar when there is no debt', () => {
		const { container } = render(LiquidiumSummary, { props: { portfolio } });

		expect(container).not.toHaveTextContent(en.liquidium.text.health_factor);
	});

	it('shows the health factor bar when there is debt', () => {
		const withDebt: LiquidiumPortfolio = {
			...portfolio,
			totalBorrowedUsd: 500,
			netValueUsd: 500,
			healthFactorPercent: 42
		};

		const { container } = render(LiquidiumSummary, { props: { portfolio: withDebt } });

		expect(container).toHaveTextContent(en.liquidium.text.health_factor);
		expect(container).toHaveTextContent('42%');
	});
});
