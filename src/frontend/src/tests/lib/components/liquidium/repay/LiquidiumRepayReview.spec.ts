import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumRepayReview from '$lib/components/liquidium/repay/LiquidiumRepayReview.svelte';
import { ZERO } from '$lib/constants/app.constants';
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
});
