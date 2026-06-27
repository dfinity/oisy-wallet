import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumBorrowForm from '$lib/components/liquidium/borrow/LiquidiumBorrowForm.svelte';
import type { LiquidiumBorrowPreview } from '$lib/services/liquidium-borrow.services';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('LiquidiumBorrowForm', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

	const portfolio = (overrides: Partial<LiquidiumPortfolio> = {}): LiquidiumPortfolio => ({
		reserves: [],
		totalSuppliedUsd: 200_000,
		totalBorrowedUsd: 0,
		netValueUsd: 200_000,
		availableBorrowsUsd: 100_000,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 100,
		...overrides
	});

	const preview = (overrides: Partial<LiquidiumBorrowPreview> = {}): LiquidiumBorrowPreview => ({
		resultingLtvPercent: 40,
		projectedHealthPercent: 70,
		healthLevel: 'healthy',
		valid: true,
		...overrides
	});

	const baseProps = {
		market,
		borrowToken: BTC_MAINNET_TOKEN,
		borrowPrice: 60_000,
		portfolio: portfolio(),
		preview: preview(),
		amount: undefined,
		confirmChecked: false,
		onClose: () => {},
		onNext: () => {}
	};

	const reviewButton = (getByRole: ReturnType<typeof render>['getByRole']) =>
		getByRole('button', { name: en.send.text.review });

	it('renders the collateral context, borrow APY, minimum borrow and risk line', () => {
		const { container } = render(LiquidiumBorrowForm, { props: baseProps });

		expect(container).toHaveTextContent(en.liquidium.text.collateral);
		expect(container).toHaveTextContent(en.liquidium.text.borrowing_power);
		expect(container).toHaveTextContent(en.liquidium.text.borrow_apy);
		expect(container).toHaveTextContent(en.liquidium.text.resulting_ltv);
		expect(container).toHaveTextContent(en.liquidium.text.minimum_borrow);
		expect(container).toHaveTextContent(en.liquidium.text.borrow_risk_info);
	});

	it('disables Review with no amount entered', () => {
		const { getByRole } = render(LiquidiumBorrowForm, { props: baseProps });

		expect(reviewButton(getByRole)).toBeDisabled();
	});

	it('enables Review for a valid amount with a healthy projection', () => {
		const { getByRole } = render(LiquidiumBorrowForm, {
			props: { ...baseProps, amount: 1 }
		});

		expect(reviewButton(getByRole)).toBeEnabled();
	});

	it('requires confirmation for a non-healthy projection before Review', async () => {
		const { container, getByRole } = render(LiquidiumBorrowForm, {
			props: { ...baseProps, amount: 1, preview: preview({ healthLevel: 'at-risk' }) }
		});

		expect(container).toHaveTextContent(en.liquidium.text.borrow_at_risk_warning);
		expect(container).toHaveTextContent(en.liquidium.text.borrow_risk_confirm);
		expect(reviewButton(getByRole)).toBeDisabled();

		await fireEvent.click(getByRole('checkbox'));

		expect(reviewButton(getByRole)).toBeEnabled();
	});
});
