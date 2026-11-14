<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
	import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
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
	import { routeAutopilotVault } from '$lib/derived/nav.derived';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { networks } from '$lib/derived/networks.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import {
		PLAUSIBLE_EVENT_ONRAMPER_ERROR_TYPES,
		PLAUSIBLE_EVENT_RESULT_STATUSES
	} from '$lib/enums/plausible';
	import { trackOnramperOpen } from '$lib/services/analytics.services';
	import { loadOnramperIds } from '$lib/services/onramper.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import { consoleError } from '$lib/utils/console.utils';
	import { getTokenIdentifier } from '$lib/utils/identifier.utils';
	import {
		buildOnramperLink,
		mapOnramperNetworkWallets,
		needsOnramperIdLookup,
		toOnramperTokenParams
	} from '$lib/utils/onramper.utils';

	let vault = $derived(
		$harvestAutopilots.find(({ token: { address } }) => address === $routeAutopilotVault)
	);

	let vaultAssetToken = $derived(
		$erc20Tokens.find(({ address }) => address === vault?.token.assetAddress)
	);

	// The widget opens on the open token, else on the asset of the open vault. Only their ids are
	// tracked: the token store also re-emits the same token, which must not sign the URL again.
	let openTokenId = $derived($token?.id);
	let vaultAssetTokenId = $derived(vaultAssetToken?.id);

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

		// Read before anything async, so that the effect tracks them: OnRamper's ids arrive later, in
		// this same run, and never trigger another signing call.
		const selectedNetworkTokens = $enabledFungibleNetworkTokens;
		const allEnabledTokens = $enabledTokens;
		const cryptoNetworks = onlyCryptoNetworks;
		const openTokenIds = [openTokenId, vaultAssetTokenId];
		const openTokens = openTokenIds.some(nonNullish)
			? untrack(() => [$token, vaultAssetToken].filter(nonNullish))
			: [];

		let cancelled = false;
		src = undefined;
		signingFailed = false;

		buildOnramperLink({
			identity: currentIdentity,
			wallets: [],
			networkWallets,
			// Started before the signing call, so that the lists load while the backend signs.
			onramperIds: needsOnramperIdLookup([...allEnabledTokens, ...openTokens])
				? loadOnramperIds()
				: undefined,
			toParams: (ids) => {
				const buy = toOnramperTokenParams({
					selectedNetworkTokens,
					enabledTokens: allEnabledTokens,
					openTokens,
					ids: ids?.buy
				});

				const sell = toOnramperTokenParams({
					selectedNetworkTokens,
					enabledTokens: allEnabledTokens,
					openTokens,
					ids: ids?.sell
				});

				return {
					mode: 'buy,sell',
					defaultCrypto: buy.defaultCrypto,
					onlyCryptos: buy.onlyCryptos,
					onlyCryptoNetworks: cryptoNetworks,
					sell_defaultCrypto: sell.defaultCrypto,
					sell_onlyCryptos: sell.onlyCryptos,
					sell_onlyCryptoNetworks: cryptoNetworks,
					supportRecurringPayments: true,
					// Without a default, OnRamper may preselect Revolut Pay as recommended even when no
					// onramp offers it for the selected fiat and token, and the widget opens on "No onramp
					// available".
					defaultPaymentMethod: 'creditcard',
					// OnRamper's country selector resets the selected token and fiat to the country's
					// defaults whenever its menu is opened, so the user would lose the token preselected
					// here.
					enableCountrySelector: false,
					themeName: 'dark' // we always pass dark, as some card elements aren't styled correctly (white text on white background) in light theme / onramper bug?
				};
			}
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
</script>

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
			onload={changeThemeOnIframeLoad}
			sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
			{src}
			title={$i18n.buy.onramper.title}
			width="100%"
		></iframe>
	{/if}
{/if}
