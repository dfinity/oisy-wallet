import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumRepayForm from '$lib/components/liquidium/repay/LiquidiumRepayForm.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import type { LiquidiumRepayPreview } from '$lib/services/liquidium-repay.services';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('LiquidiumRepayForm', () => {
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

	const preview: LiquidiumRepayPreview = { projectedHealthPercent: 80 };

	const mockContext = () =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: BTC_MAINNET_TOKEN })]
		]);

	const feeDisplay = createRawSnippet(() => ({ render: () => '<span>network fee</span>' }));

	const baseProps = {
		reserve,
		preview,
		amount: undefined,
		maxRepay: 100_000_000n,
		totalFee: 100n,
		inflowFee: 50n,
		feeDisplay,
		onClose: () => {},
		onNext: () => {}
	};

	it('renders current debt, interest accrued, debt after repay, provider fee and projected health', () => {
		const { container } = render(LiquidiumRepayForm, {
			props: baseProps,
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.current_debt);
		expect(container).toHaveTextContent(en.liquidium.text.interest_accrued);
		expect(container).toHaveTextContent(en.liquidium.text.debt_after_repay);
		expect(container).toHaveTextContent(en.liquidium.text.provider_fee);
		expect(container).toHaveTextContent(en.liquidium.text.projected_health_factor);
	});

	it('does not show a supply-style agreement checkbox', () => {
		const { container } = render(LiquidiumRepayForm, {
			props: baseProps,
			context: mockContext()
		});

		expect(container).not.toHaveTextContent(en.liquidium.text.supply_agreement);
	});

	it('surfaces an amount error from the custom validator', () => {
		const { container } = render(LiquidiumRepayForm, {
			props: {
				...baseProps,
				amount: 1,
				onCustomErrorValidate: () => new Error(en.liquidium.text.insufficient_funds_for_fee)
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.insufficient_funds_for_fee);
	});

	it('rejects an amount above the outstanding debt (full-debt cap)', () => {
		const { container } = render(LiquidiumRepayForm, {
			// maxRepay = 1 BTC (100_000_000 sat); typing 2 exceeds the debt.
			props: { ...baseProps, amount: 2 },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.repay_exceeds_debt);
	});

	it('accepts an amount within the outstanding debt', () => {
		const { container } = render(LiquidiumRepayForm, {
			props: { ...baseProps, amount: 0.5 },
			context: mockContext()
		});

		expect(container).not.toHaveTextContent(en.liquidium.text.repay_exceeds_debt);
	});

	it('surfaces a retry message when the provider-fee estimate is unavailable', () => {
		const { container } = render(LiquidiumRepayForm, {
			props: { ...baseProps, inflowFee: undefined, inflowFeeUnavailable: true },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.repay_prices_unavailable);
	});

	it('does not show the retry message when the fee is available', () => {
		const { container } = render(LiquidiumRepayForm, {
			props: baseProps,
			context: mockContext()
		});

		expect(container).not.toHaveTextContent(en.liquidium.text.repay_prices_unavailable);
	});

	it('keeps the form disabled until the debt cap has loaded', () => {
		const { container, getByTestId } = render(LiquidiumRepayForm, {
			props: { ...baseProps, amount: 0.5, maxRepay: undefined },
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
		expect(container).not.toHaveTextContent(en.liquidium.text.repay_debt_unavailable);
	});

	it('says the debt is unavailable when the cap failed to load', () => {
		const { container, getByTestId } = render(LiquidiumRepayForm, {
			props: { ...baseProps, amount: 0.5, maxRepay: undefined, maxRepayUnavailable: true },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.repay_debt_unavailable);
		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('shows pending repays in the debt breakdown', () => {
		const { container } = render(LiquidiumRepayForm, {
			props: { ...baseProps, maxRepay: 50_000_000n, pendingRepay: 50_000_000n },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.pending_repays);
		expect(container).not.toHaveTextContent(en.liquidium.text.repay_pending_covers_debt);
	});

	it('rejects an amount above the debt left after pending repays', () => {
		const { container } = render(LiquidiumRepayForm, {
			// The modal nets pending repays out of the cap: 1 BTC debt − 0.5 BTC pending.
			props: { ...baseProps, amount: 0.6, maxRepay: 50_000_000n, pendingRepay: 50_000_000n },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.repay_exceeds_debt);
	});

	it('blocks the form when pending repays cover the whole debt', () => {
		const { container, getByTestId } = render(LiquidiumRepayForm, {
			props: { ...baseProps, amount: 0.1, maxRepay: ZERO, pendingRepay: 100_000_000n },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.repay_pending_covers_debt);
		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('blocks the form when pending repays cover the debt but accrued interest leaves dust in the cap', () => {
		const { container, getByTestId } = render(LiquidiumRepayForm, {
			// 1 BTC pending ≥ the 1 BTC debt (interest included).
			props: { ...baseProps, maxRepay: 38n, pendingRepay: 100_000_000n },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.repay_pending_covers_debt);
		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('does not block the form on a zero cap without pending repays', () => {
		const { container } = render(LiquidiumRepayForm, {
			props: { ...baseProps, maxRepay: ZERO },
			context: mockContext()
		});

		expect(container).not.toHaveTextContent(en.liquidium.text.repay_pending_covers_debt);
	});
});
