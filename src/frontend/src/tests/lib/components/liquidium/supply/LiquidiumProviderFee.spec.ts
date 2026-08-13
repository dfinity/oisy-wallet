import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumProviderFee from '$lib/components/liquidium/supply/LiquidiumProviderFee.svelte';
import { SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { formatToken } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('LiquidiumProviderFee', () => {
	const context = mockContextMap([
		[
			SEND_CONTEXT_KEY,
			{
				sendToken: readable(BTC_MAINNET_TOKEN),
				sendTokenDecimals: readable(BTC_MAINNET_TOKEN.decimals),
				sendTokenId: readable(BTC_MAINNET_TOKEN.id),
				sendTokenStandard: readable(BTC_MAINNET_TOKEN.standard),
				sendTokenSymbol: readable(BTC_MAINNET_TOKEN.symbol),
				sendTokenNetworkId: readable(BTC_MAINNET_TOKEN.network.id),
				sendTokenExchangeRate: readable(undefined)
			}
		]
	]);

	it('renders the provider fee label, amount and symbol', () => {
		const inflowFee = 1500n;

		const { container } = render(LiquidiumProviderFee, { props: { inflowFee }, context });

		expect(container).toHaveTextContent(en.liquidium.text.provider_fee);
		expect(container).toHaveTextContent(
			formatToken({
				value: inflowFee,
				unitName: BTC_MAINNET_TOKEN.decimals,
				displayDecimals: BTC_MAINNET_TOKEN.decimals
			})
		);
		expect(container).toHaveTextContent(BTC_MAINNET_TOKEN.symbol);
	});

	it('renders nothing when no fee is provided', () => {
		const { container } = render(LiquidiumProviderFee, { props: {}, context });

		expect(container).not.toHaveTextContent(en.liquidium.text.provider_fee);
	});
});
