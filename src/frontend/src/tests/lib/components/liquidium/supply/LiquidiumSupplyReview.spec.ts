import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumSupplyReview from '$lib/components/liquidium/supply/LiquidiumSupplyReview.svelte';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('LiquidiumSupplyReview', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

	const mockContext = () =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: BTC_MAINNET_TOKEN })]
		]);

	const feeDisplay = createRawSnippet(() => ({ render: () => '<span>network fee</span>' }));

	it('renders the provider name, supply APY and provider fee', () => {
		const { container } = render(LiquidiumSupplyReview, {
			props: {
				market,
				amount: 0.01,
				inflowFee: 50n,
				feeDisplay,
				onBack: () => {},
				onConfirm: () => {}
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent('Liquidium');
		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
		expect(container).toHaveTextContent(en.liquidium.text.provider_fee);
	});
});
