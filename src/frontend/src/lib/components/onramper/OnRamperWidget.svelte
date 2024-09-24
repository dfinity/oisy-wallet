<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { networks } from '$lib/derived/networks.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import type { OnramperId, OnramperNetworkId } from '$lib/types/onramper';
	import { buildOnRamperLink } from '$lib/utils/onramper.utils';

	let defaultCrypto: OnramperId | undefined;
	$: defaultCrypto = $pageToken?.buy?.onramperId;

	let onlyCryptos: OnramperId[];
	$: onlyCryptos = $tokens.map((token) => token.buy?.onramperId).filter(nonNullish);

	let onlyCryptoNetworks: OnramperNetworkId[];
	$: onlyCryptoNetworks = $networks.map((network) => network.buy?.onramperId).filter(nonNullish);

	let src: string;
	$: defaultCrypto,
		onlyCryptos,
		onlyCryptoNetworks,
		(src = buildOnRamperLink({
			mode: 'buy',
			defaultFiat: 'usd',
			defaultCrypto,
			onlyCryptos,
			onlyCryptoNetworks,
			wallets: [],
			supportRecurringPayments: true,
			enableCountrySelector: true
		}));
</script>

<iframe
	{src}
	title="Onramper Widget"
	height="630px"
	width="100%"
	allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
/>
