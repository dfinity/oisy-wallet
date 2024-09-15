<script lang="ts">
	import { buildOnRamperLink } from '$lib/utils/onramper.utils';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { networks } from '$lib/derived/networks.derived';

	let src: string;
	$: src = buildOnRamperLink({
		mode: 'buy',
		defaultFiat: 'USD',
		defaultCrypto: $pageToken?.symbol,
		onlyCryptos: $tokens.map((token) => token.symbol),
		onlyCryptoNetworks: $networks.map((network) => network.name),
		wallets: [],
		supportRecurringPayments: true,
		enableCountrySelector: true
	});
</script>

<iframe
	{src}
	title="Onramper Widget"
	height="630px"
	width="100%"
	allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
/>
