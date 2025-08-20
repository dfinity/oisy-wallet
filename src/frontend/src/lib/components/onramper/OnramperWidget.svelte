<script lang="ts">
	import { Spinner } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
	import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import { icpAccountIdentifierText } from '$icp/derived/ic.derived';
	import { btcAddressMainnet, ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { networkBitcoin, networkEthereum, networkSolana } from '$lib/derived/network.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import { buildOnramperLink, mapOnramperNetworkWallets } from '$lib/utils/onramper.utils';

	let defaultCrypto = $derived(
		$token?.buy?.onramperId ??
			($networkEthereum
				? ETHEREUM_TOKEN.buy?.onramperId
				: $networkBitcoin
					? BTC_MAINNET_TOKEN.buy?.onramperId
					: $networkSolana
						? SOLANA_TOKEN.buy?.onramperId
						: ICP_TOKEN.buy?.onramperId) ??
			ICP_TOKEN.buy?.onramperId ??
			undefined
	);

	// List of Cryptocurrencies that are allowed to be bought
	let onlyCryptos = $derived(
		$enabledTokens.map((token) => token.buy?.onramperId).filter(nonNullish)
	);

	// List of Cryptocurrency Networks to which the tokens are allowed to be bought
	let onlyCryptoNetworks = $derived(
		$networks.map((network) => network.buy?.onramperId).filter(nonNullish)
	);

	let networkWallets = $derived(
		mapOnramperNetworkWallets({
			networks: $networks,
			walletMap: new Map([
				[BTC_MAINNET_NETWORK_ID, $btcAddressMainnet],
				[ETHEREUM_NETWORK_ID, $ethAddress],
				[ICP_NETWORK_ID, $icpAccountIdentifierText],
				[SOLANA_MAINNET_NETWORK_ID, $solAddressMainnet]
			])
		})
	);

	let src = $derived(
		buildOnramperLink({
			mode: 'buy',
			defaultFiat: $currentCurrency,
			defaultCrypto,
			onlyCryptos,
			onlyCryptoNetworks,
			wallets: [],
			networkWallets,
			supportRecurringPayments: true,
			enableCountrySelector: true,
			themeName: 'dark' // we always pass dark, as some card elements aren't styled correctly (white text on white background) in light theme / onramper bug?
		})
	);

	let themeLoaded = $state(false);

	const changeThemeOnIframeLoad = (e: Event) => {
		try {
			const styles = window.getComputedStyle(document.body);
			const iframeElement = e.currentTarget as HTMLIFrameElement;
			iframeElement?.contentWindow?.postMessage(
				{
					type: 'change-theme',
					id: 'change-theme',
					theme: {
						primaryColor: styles.getPropertyValue('--color-background-brand-primary'),
						secondaryColor: styles.getPropertyValue('--color-background-brand-subtle-20'),
						primaryTextColor: styles.getPropertyValue('--color-foreground-primary'),
						secondaryTextColor: styles.getPropertyValue('--color-foreground-secondary'),
						containerColor: styles.getPropertyValue('--color-background-surface'),
						cardColor: styles.getPropertyValue('--color-background-brand-subtle-10'),
						primaryBtnTextColor: styles.getPropertyValue('--color-foreground-primary-inverted'),
						borderRadius: '0.5rem',
						widgetBorderRadius: '0rem'
					}
				},
				'*'
			);
		} catch (error) {
			console.error('Could not apply onramper widget theme', error);
		} finally {
			themeLoaded = true;
		}
	};
</script>

<!-- The `allow` prop is set as suggested in the Onramper documentation that can be found at https://docs.onramper.com/docs/customise-the-ux -->
<!-- When Onramper engineers were inquired about the reason, they answered: -->
<!-- "In order to do customer verification before purchase, we require the following permissions to be given to the app. So this is definitely merely for the KYC  and also for fraud detection algorithms i suppose" -->

<div
	class="absolute bottom-0 left-0 right-0 top-0 bg-surface text-brand-primary transition-all duration-500 ease-in-out"
	class:invisible={themeLoaded}
	class:opacity-0={themeLoaded}
	class:opacity-100={!themeLoaded}
>
	<Spinner inline />
</div>

<iframe
	allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
	height="680px"
	onload={changeThemeOnIframeLoad}
	sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
	{src}
	title={$i18n.buy.onramper.title}
	width="100%"
></iframe>
