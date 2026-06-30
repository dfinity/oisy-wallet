import LiquidiumRepayDebtRows from '$lib/components/liquidium/repay/LiquidiumRepayDebtRows.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumRepayDebtRows', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 0,
		borrowApy: 9,
		deposited: ZERO,
		depositedDecimals: 8,
		borrowed: 100_000_000n,
		borrowedDecimals: 8,
		debtInterest: 500_000n,
		suppliedUsd: 0,
		borrowedUsd: 1_000
	};

	it('renders the three debt labels', () => {
		const { container } = render(LiquidiumRepayDebtRows, { props: { reserve, amount: undefined } });

		expect(container).toHaveTextContent(en.liquidium.text.current_debt);
		expect(container).toHaveTextContent(en.liquidium.text.interest_accrued);
		expect(container).toHaveTextContent(en.liquidium.text.debt_after_repay);
	});

	it('leaves the full debt outstanding when no amount is entered', () => {
		const { container } = render(LiquidiumRepayDebtRows, { props: { reserve, amount: undefined } });

		// Debt after repay equals current debt (1 BTC) since nothing is repaid yet.
		expect(container).toHaveTextContent('1 BTC');
	});

	it('clamps the remaining debt to zero when repaying the full amount', () => {
		const { container } = render(LiquidiumRepayDebtRows, { props: { reserve, amount: 2 } });

		// totalDebt (1.005 BTC) < parsedRepay (2 BTC) → remaining clamped to 0.
		expect(container).toHaveTextContent('0 BTC');
	});

	it('treats a missing accrued interest as zero', () => {
		const { container } = render(LiquidiumRepayDebtRows, {
			props: { reserve: { ...reserve, debtInterest: undefined }, amount: 0.5 }
		});

		expect(container).toHaveTextContent(en.liquidium.text.interest_accrued);
	});

	it('renders without dividing by zero when there is no principal debt', () => {
		const { container } = render(LiquidiumRepayDebtRows, {
			props: { reserve: { ...reserve, borrowed: ZERO, borrowedUsd: 0 }, amount: 0.5 }
		});

		expect(container).toHaveTextContent(en.liquidium.text.debt_after_repay);
	});
});