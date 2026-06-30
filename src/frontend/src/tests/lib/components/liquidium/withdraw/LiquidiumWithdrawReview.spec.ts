import LiquidiumWithdrawReview from '$lib/components/liquidium/withdraw/LiquidiumWithdrawReview.svelte';
import { ZERO } from '$lib/constants/app.constants';
import type { LiquidiumWithdrawPreview } from '$lib/services/liquidium-withdraw.services';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumWithdrawReview', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 0,
		deposited: 100_000_000n,
		depositedDecimals: 8,
		borrowed: ZERO,
		borrowedDecimals: 8,
		suppliedUsd: 100_000,
		borrowedUsd: 0
	};

	const preview = (
		overrides: Partial<LiquidiumWithdrawPreview> = {}
	): LiquidiumWithdrawPreview => ({
		projectedHealthPercent: 70,
		healthLevel: 'healthy',
		maxWithdrawableUsd: 100_000,
		reservedByDebtUsd: 0,
		valid: true,
		...overrides
	});

	const baseProps = {
		reserve,
		withdrawPrice: 60_000,
		amount: 0.5,
		onBack: () => {},
		onConfirm: () => {}
	};

	it('renders the provider, projected health and funds destination', () => {
		const { container } = render(LiquidiumWithdrawReview, {
			props: { ...baseProps, preview: preview() }
		});

		expect(container).toHaveTextContent('Liquidium');
		expect(container).toHaveTextContent(en.liquidium.text.projected_health_factor);
		expect(container).toHaveTextContent(en.liquidium.text.funds_delivered_to);
	});

	it('shows no risk warning for a healthy projection', () => {
		const { container } = render(LiquidiumWithdrawReview, {
			props: { ...baseProps, preview: preview() }
		});

		expect(container).not.toHaveTextContent(en.liquidium.text.withdraw_at_risk_warning);
		expect(container).not.toHaveTextContent(en.liquidium.text.withdraw_high_risk_warning);
	});

	it('shows the at-risk warning for an at-risk projection', () => {
		const { container } = render(LiquidiumWithdrawReview, {
			props: {
				...baseProps,
				preview: preview({ healthLevel: 'at-risk', projectedHealthPercent: 30 })
			}
		});

		expect(container).toHaveTextContent(en.liquidium.text.withdraw_at_risk_warning);
	});

	it('shows the high-risk warning for a critical projection', () => {
		const { container } = render(LiquidiumWithdrawReview, {
			props: {
				...baseProps,
				preview: preview({ healthLevel: 'critical', projectedHealthPercent: 5 })
			}
		});

		expect(container).toHaveTextContent(en.liquidium.text.withdraw_high_risk_warning);
	});
});
