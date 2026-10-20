import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumRepayReview from '$lib/components/liquidium/repay/LiquidiumRepayReview.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import type { LiquidiumRepayPreview } from '$lib/services/liquidium-repay.services';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumReserve } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('LiquidiumRepayReview', () => {
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
		amount: 0.5,
		preview,
		maxRepay: 100_000_000n,
		inflowFee: 50n,
		feeDisplay,
		onBack: () => {},
		onConfirm: () => {}
	};

	it('renders the provider, debt breakdown, projected health and provider fee', () => {
		const { container } = render(LiquidiumRepayReview, {
			props: baseProps,
			context: mockContext()
		});

		expect(container).toHaveTextContent('Liquidium');
		expect(container).toHaveTextContent(en.liquidium.text.current_debt);
		expect(container).toHaveTextContent(en.liquidium.text.interest_accrued);
		expect(container).toHaveTextContent(en.liquidium.text.debt_after_repay);
		expect(container).toHaveTextContent(en.liquidium.text.projected_health_factor);
		expect(container).toHaveTextContent(en.liquidium.text.provider_fee);
	});

	it('enables Confirm for an amount within the cap', () => {
		const { getByTestId, container } = render(LiquidiumRepayReview, {
			props: baseProps,
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled');
		expect(container).not.toHaveTextContent(en.liquidium.text.repay_exceeds_debt);
	});

	it('disables Confirm while the cap is loading', () => {
		const { getByTestId, container } = render(LiquidiumRepayReview, {
			props: { ...baseProps, maxRepay: undefined },
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
		expect(container).not.toHaveTextContent(en.liquidium.text.repay_debt_unavailable);
	});

	it('disables Confirm and says the debt is unavailable when the cap failed to load', () => {
		const { getByTestId, container } = render(LiquidiumRepayReview, {
			props: { ...baseProps, maxRepay: undefined, maxRepayUnavailable: true },
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
		expect(container).toHaveTextContent(en.liquidium.text.repay_debt_unavailable);
	});

	it('disables Confirm and flags an amount over the cap', () => {
		const { getByTestId, container } = render(LiquidiumRepayReview, {
			// 2 BTC against a 1 BTC cap: the cap dropped under an open Review.
			props: { ...baseProps, amount: 2 },
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
		expect(container).toHaveTextContent(en.liquidium.text.repay_exceeds_debt);
	});

	it('disables Confirm and says a repayment is still processing when pending repays cover the debt', () => {
		const { getByTestId, container } = render(LiquidiumRepayReview, {
			// 1.005 BTC pending ≥ 1 BTC principal + 0.005 BTC interest; the protocol buffer leaves a
			// dust cap that the 100-sat amount fits, so the plain cap check alone would let it through.
			props: { ...baseProps, amount: 0.000001, maxRepay: 150n, pendingRepay: 100_500_000n },
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
		expect(container).toHaveTextContent(en.liquidium.text.repay_pending_covers_debt);
		expect(container).not.toHaveTextContent(en.liquidium.text.repay_exceeds_debt);
	});
});
