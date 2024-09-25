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
	import { tokens } from '$lib/derived/tokens.derived';
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

	let onlyCryptos: OnramperId[];
	$: onlyCryptos = $tokens.map((token) => token.buy?.onramperId).filter(nonNullish);

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

<iframe
	{src}
	title="Onramper Widget"
	height="630px"
	width="100%"
	allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
/>
