<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import {
		BTC_MAINNET_NETWORK_ID,
		ETHEREUM_NETWORK_ID,
		ICP_NETWORK_ID
	} from '$env/networks/networks.env';
	import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import { ethereumToken } from '$eth/derived/token.derived';
	import { icpAccountIdentifierText } from '$icp/derived/ic.derived';
	import { btcAddressMainnet, ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { networkBitcoin, networkEthereum, networkSolana } from '$lib/derived/network.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { OnramperId, OnramperNetworkId, OnramperNetworkWallet } from '$lib/types/onramper';
	import { buildOnramperLink, mapOnramperNetworkWallets } from '$lib/utils/onramper.utils';

	let defaultCrypto: OnramperId | undefined;
	$: defaultCrypto =
		$token?.buy?.onramperId ??
		($networkEthereum
			? $ethereumToken.buy?.onramperId
			: $networkBitcoin
				? BTC_MAINNET_TOKEN.buy?.onramperId
				: $networkSolana
					? SOLANA_TOKEN.buy?.onramperId
					: ICP_TOKEN.buy?.onramperId) ??
		ICP_TOKEN.buy?.onramperId ??
		undefined;

	// List of Cryptocurrencies that are allowed to be bought
	let onlyCryptos: OnramperId[];
	$: onlyCryptos = $enabledTokens.map((token) => token.buy?.onramperId).filter(nonNullish);

	// List of Cryptocurrency Networks to which the tokens are allowed to be bought
	let onlyCryptoNetworks: OnramperNetworkId[];
	$: onlyCryptoNetworks = $networks.map((network) => network.buy?.onramperId).filter(nonNullish);

	let networkWallets: OnramperNetworkWallet[];
	$: networkWallets = mapOnramperNetworkWallets({
		networks: $networks,
		walletMap: new Map([
			[BTC_MAINNET_NETWORK_ID, $btcAddressMainnet],
			[ETHEREUM_NETWORK_ID, $ethAddress],
			[ICP_NETWORK_ID, $icpAccountIdentifierText],
			[SOLANA_MAINNET_NETWORK_ID, $solAddressMainnet]
		])
	});

	let src: string;
	$: defaultCrypto,
		onlyCryptos,
		onlyCryptoNetworks,
		networkWallets,
		(src = buildOnramperLink({
			mode: 'buy',
			defaultFiat: 'usd',
			defaultCrypto,
			onlyCryptos,
			onlyCryptoNetworks,
			wallets: [],
			networkWallets,
			supportRecurringPayments: true,
			enableCountrySelector: true
		}));
</script>

<!-- The `allow` prop is set as suggested in the Onramper documentation that can be found at https://docs.onramper.com/docs/customise-the-ux -->
<!-- When Onramper engineers were inquired about the reason, they answered: -->
<!-- "In order to do customer verification before purchase, we require the following permissions to be given to the app. So this is definitely merely for the KYC  and also for fraud detection algorithms i suppose" -->
<iframe
	{src}
	title={$i18n.buy.onramper.title}
	height="680px"
	width="100%"
	allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
	sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
></iframe>
