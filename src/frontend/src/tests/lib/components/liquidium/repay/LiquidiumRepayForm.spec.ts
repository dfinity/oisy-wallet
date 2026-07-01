import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumRepayForm from '$lib/components/liquidium/repay/LiquidiumRepayForm.svelte';
import { ZERO } from '$lib/constants/app.constants';
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
});
