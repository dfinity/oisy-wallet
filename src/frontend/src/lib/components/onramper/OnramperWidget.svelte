<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
	import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
	import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
	import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { harvestAutopilots } from '$eth/derived/harvest-autopilots.derived';
	import { icpAccountIdentifierText } from '$icp/derived/ic.derived';
	import {
		OnramperRateLimitedError,
		OnramperSecretNotConfiguredError
	} from '$lib/canisters/errors';
	import BuyUnavailableNotice from '$lib/components/buy/BuyUnavailableNotice.svelte';
	import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';
	import { BUY_MODAL_ONRAMPER_IFRAME } from '$lib/constants/test-ids.constants';
	import { btcAddressMainnet, ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { routeAutopilotVault } from '$lib/derived/nav.derived';
	import { networkBitcoin, networkEthereum, networkSolana } from '$lib/derived/network.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import {
		PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES,
		PLAUSIBLE_EVENT_RESULT_STATUSES
	} from '$lib/enums/plausible';
	import { trackOnramperOpen } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import { consoleError } from '$lib/utils/console.utils';
	import { getTokenIdentifier } from '$lib/utils/identifier.utils';
	import { buildOnramperLink, mapOnramperNetworkWallets } from '$lib/utils/onramper.utils';

	let vault = $derived(
		$harvestAutopilots.find(({ token: { address } }) => address === $routeAutopilotVault)
	);

	let vaultAssetToken = $derived(
		$erc20Tokens.find(({ address }) => address === vault?.token.assetAddress)
	);

	let defaultCrypto = $derived(
		$token?.buy?.onramperId ??
			vaultAssetToken?.buy?.onramperId ??
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

	let src = $state<string | undefined>(undefined);
	let signingFailed = $state(false);

	let tokenPayload = $derived(
		nonNullish($token)
			? {
					network: $token.network.id.description ?? '',
					symbol: $token.symbol,
					name: $token.name,
					address: getTokenIdentifier($token)
				}
			: undefined
	);

	const classifyOnramperError = (error: unknown): PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES =>
		error instanceof OnramperSecretNotConfiguredError
			? PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES.SECRET_NOT_CONFIGURED
			: error instanceof OnramperRateLimitedError
				? PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES.RATE_LIMITED
				: PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES.SIGNING_FAILED;

	// Resolve the signed widget URL through the backend canister whenever the inputs change. Build
	// the link asynchronously (the canister returns the HMAC over the sensitive parameters) and
	// guard against late resolutions overwriting newer state via a cancellation token.
	$effect(() => {
		const currentIdentity = $authIdentity;
		if (isNullish(currentIdentity)) {
			src = undefined;
			signingFailed = false;
			return;
		}

		let cancelled = false;
		src = undefined;
		signingFailed = false;

		buildOnramperLink({
			identity: currentIdentity,
			mode: 'buy,sell',
			defaultFiat: $currentCurrency,
			defaultCrypto,
			onlyCryptos,
			onlyCryptoNetworks,
			sell_defaultFiat: $currentCurrency,
			sell_defaultCrypto: defaultCrypto,
			sell_onlyCryptos: onlyCryptos,
			sell_onlyCryptoNetworks: onlyCryptoNetworks,
			wallets: [],
			networkWallets,
			supportRecurringPayments: true,
			enableCountrySelector: true,
			themeName: 'dark' // we always pass dark, as some card elements aren't styled correctly (white text on white background) in light theme / onramper bug?
		})
			.then((url) => {
				if (!cancelled) {
					src = url;

					trackOnramperOpen({
						token: tokenPayload,
						status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
					});
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					consoleError('Could not sign OnRamper widget URL', error);
					signingFailed = true;

					trackOnramperOpen({
						token: tokenPayload,
						status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
						errorType: classifyOnramperError(error),
						errorMessage: error instanceof Error ? error.message : undefined
					});
				}
			});

		return () => {
			cancelled = true;
		};
	});

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
			consoleError('Could not apply onramper widget theme', error);
		} finally {
			themeLoaded = true;
		}
	};

	// OnRamper's widget focuses its amount input shortly after it loads. That puts the keyboard in
	// the cross-origin iframe, where key presses never reach OISY, so Escape stops closing the
	// modal. Hand that unrequested focus back, once per widget and only in the first seconds, so
	// the user's own clicks into the widget are left alone.
	const WIDGET_AUTOFOCUS_WINDOW_MS = 5_000;

	let autofocusWatch:
		{ iframe: HTMLIFrameElement; previousFocus: Element | null; until: number } | undefined;

	const watchWidgetAutofocus = ({ currentTarget }: Event) => {
		// Later loads of the same iframe are navigations inside the widget, which the user started.
		if (!(currentTarget instanceof HTMLIFrameElement) || autofocusWatch?.iframe === currentTarget) {
			return;
		}

		autofocusWatch = {
			iframe: currentTarget,
			previousFocus: document.activeElement,
			until: Date.now() + WIDGET_AUTOFOCUS_WINDOW_MS
		};
	};

	const returnFocusTakenByWidget = () => {
		const watch = autofocusWatch;

		if (isNullish(watch) || document.activeElement !== watch.iframe || Date.now() > watch.until) {
			return;
		}

		watch.until = 0;

		// Focusing during this blur would leave the keyboard in the iframe, so wait until the browser
		// has finished moving it there.
		setTimeout(() => {
			if (document.activeElement !== watch.iframe) {
				return;
			}

			const { previousFocus } = watch;

			if (
				previousFocus instanceof HTMLElement &&
				previousFocus.isConnected &&
				previousFocus !== watch.iframe
			) {
				previousFocus.focus({ preventScroll: true });
				return;
			}

			watch.iframe.blur();
		});
	};

	const onIframeLoad = (e: Event) => {
		watchWidgetAutofocus(e);
		changeThemeOnIframeLoad(e);
	};
</script>

<svelte:window onblur={returnFocusTakenByWidget} />

<!-- The `allow` prop is set as suggested in the Onramper documentation that can be found at https://docs.onramper.com/docs/customise-the-ux -->
<!-- When Onramper engineers were inquired about the reason, they answered: -->
<!-- "In order to do customer verification before purchase, we require the following permissions to be given to the app. So this is definitely merely for the KYC  and also for fraud detection algorithms i suppose" -->

{#if signingFailed}
	<BuyUnavailableNotice reason="signing-failed" />
{:else}
	<div
		class="absolute top-0 right-0 bottom-0 left-0 bg-surface text-brand-primary transition-all duration-500 ease-in-out"
		class:invisible={themeLoaded && nonNullish(src)}
		class:opacity-0={themeLoaded && nonNullish(src)}
		class:opacity-100={!themeLoaded || isNullish(src)}
	>
		<LoaderSpinner />
	</div>

	{#if nonNullish(src)}
		<iframe
			allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
			data-tid={BUY_MODAL_ONRAMPER_IFRAME}
			height="680px"
			onload={onIframeLoad}
			sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
			{src}
			title={$i18n.buy.onramper.title}
			width="100%"
		></iframe>
	{/if}
{/if}
