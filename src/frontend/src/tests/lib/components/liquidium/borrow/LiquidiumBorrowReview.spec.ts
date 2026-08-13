import LiquidiumBorrowReview from '$lib/components/liquidium/borrow/LiquidiumBorrowReview.svelte';
import type { LiquidiumBorrowPreview } from '$lib/services/liquidium-borrow.services';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumBorrowReview', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

	const preview = (overrides: Partial<LiquidiumBorrowPreview> = {}): LiquidiumBorrowPreview => ({
		resultingLtvPercent: 40,
		projectedHealthPercent: 70,
		healthLevel: 'healthy',
		valid: true,
		...overrides
	});

	const baseProps = {
		market,
		borrowPrice: 60_000,
		amount: 0.01,
		onBack: () => {},
		onConfirm: () => {}
	};

	it('renders the provider, borrow APY, resulting LTV and projected health', () => {
		const { container } = render(LiquidiumBorrowReview, {
			props: { ...baseProps, preview: preview() }
		});

		expect(container).toHaveTextContent('Liquidium');
		expect(container).toHaveTextContent(en.liquidium.text.borrow_apy);
		expect(container).toHaveTextContent(en.liquidium.text.resulting_ltv);
		expect(container).toHaveTextContent(en.liquidium.text.projected_health_factor);
		expect(container).toHaveTextContent(en.liquidium.text.funds_delivered_to);
	});

	it('shows no risk warning for a healthy projection', () => {
		const { container } = render(LiquidiumBorrowReview, {
			props: { ...baseProps, preview: preview() }
		});

		expect(container).not.toHaveTextContent(en.liquidium.text.borrow_at_risk_warning);
		expect(container).not.toHaveTextContent(en.liquidium.text.borrow_high_risk_warning);
	});

	it('shows the at-risk warning for an at-risk projection', () => {
		const { container } = render(LiquidiumBorrowReview, {
			props: {
				...baseProps,
				preview: preview({ healthLevel: 'at-risk', projectedHealthPercent: 30 })
			}
		});

		expect(container).toHaveTextContent(en.liquidium.text.borrow_at_risk_warning);
	});

	it('shows the high-risk warning for a critical projection', () => {
		const { container } = render(LiquidiumBorrowReview, {
			props: {
				...baseProps,
				preview: preview({ healthLevel: 'critical', projectedHealthPercent: 5 })
			}
		});

		expect(container).toHaveTextContent(en.liquidium.text.borrow_high_risk_warning);
	});
});
