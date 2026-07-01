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

	it('renders the health factor, net value and net APY labels', () => {
		const { container } = render(LiquidiumSummary, { props: { portfolio } });

		expect(container).toHaveTextContent(en.liquidium.text.health_factor);
		expect(container).toHaveTextContent(en.liquidium.text.net_value);
		expect(container).toHaveTextContent(en.liquidium.text.net_apy);
	});

	it('renders the portfolio health factor percentage', () => {
		const { container } = render(LiquidiumSummary, { props: { portfolio } });

		expect(container).toHaveTextContent('73%');
	});

	it('defaults to 100% health when there is no portfolio', () => {
		const { container } = render(LiquidiumSummary, { props: { portfolio: null } });

		expect(container).toHaveTextContent('100%');
	});

	it('renders a negative net APY with a minus sign', () => {
		const negativeApy: LiquidiumPortfolio = {
			...portfolio,
			reserves: [
				{
					...portfolio.reserves[0],
					supplyApy: 1,
					borrowApy: 20,
					borrowedUsd: 900
				}
			],
			totalBorrowedUsd: 900,
			netValueUsd: 100
		};

		const { container } = render(LiquidiumSummary, { props: { portfolio: negativeApy } });

		// Weighted (1000·1 − 900·20) / 100 < 0 → shown with a minus sign.
		expect(container).toHaveTextContent('−');
	});

	it('renders an at-risk health factor (amber band)', () => {
		const { container } = render(LiquidiumSummary, {
			props: { portfolio: { ...portfolio, healthFactorPercent: 30 } }
		});

		expect(container).toHaveTextContent('30%');
	});

	it('renders a critical health factor (red band)', () => {
		const { container } = render(LiquidiumSummary, {
			props: { portfolio: { ...portfolio, healthFactorPercent: 8 } }
		});

		expect(container).toHaveTextContent('8%');
	});
});
