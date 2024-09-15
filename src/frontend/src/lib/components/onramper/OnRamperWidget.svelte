<script lang="ts">
	import { buildOnRamperLink } from '$lib/utils/onramper.utils';

	let src: string;
	$: src = buildOnRamperLink({
		mode: 'buy',
		defaultFiat: 'USD',
		onlyCryptos: ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'],
		onlyCryptoNetworks: ['bitcoin', 'ethereum', 'ethereum', 'ethereum', 'ethereum'],
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
