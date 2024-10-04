<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';
	import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
	import { ICP_TOKEN } from '$env/tokens.env';
	import { ethereumToken } from '$eth/derived/token.derived';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { btcAddressMainnet, ethAddress } from '$lib/derived/address.derived';
	import { networkBitcoin, networkEthereum } from '$lib/derived/network.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { enabledTokens, tokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { OnramperCryptoWallet, OnramperId, OnramperNetworkId } from '$lib/types/onramper';
	import { buildOnramperLink, mapOnramperWallets } from '$lib/utils/onramper.utils';

	let defaultCrypto: OnramperId | undefined;
	$: defaultCrypto =
		$token?.buy?.onramperId ??
		($networkEthereum
			? $ethereumToken.buy?.onramperId
			: $networkBitcoin && NETWORK_BITCOIN_ENABLED
				? BTC_MAINNET_TOKEN.buy?.onramperId
				: ICP_TOKEN.buy?.onramperId) ??
		ICP_TOKEN.buy?.onramperId ??
		undefined;

	// List of Cryptocurrencies that are allowed to be bought
	let onlyCryptos: OnramperId[];
	$: onlyCryptos = $enabledTokens.map((token) => token.buy?.onramperId).filter(nonNullish);

	// List of Cryptocurrency Networks to which the tokens are allowed to be bought
	let onlyCryptoNetworks: OnramperNetworkId[];
	$: onlyCryptoNetworks = $networks.map((network) => network.buy?.onramperId).filter(nonNullish);

	let wallets: OnramperCryptoWallet[];
	$: wallets = mapOnramperWallets({
		tokens: $tokens,
		walletMap: {
			bitcoin: $btcAddressMainnet,
			ethereum: $ethAddress,
			erc20: $ethAddress,
			icrc: $icrcAccountIdentifierText,
			icp: $icrcAccountIdentifierText
		}
	});

	let src: string;
	$: defaultCrypto,
		onlyCryptos,
		onlyCryptoNetworks,
		wallets,
		(src = buildOnramperLink({
			mode: 'buy',
			defaultFiat: 'usd',
			defaultCrypto,
			onlyCryptos,
			onlyCryptoNetworks,
			wallets,
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
	height="660px"
	width="100%"
	allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
/>
