<script lang="ts">
	import { page } from '$app/state';
	import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { enabledEvmTokens } from '$evm/derived/tokens.derived';
	import {
		COLLECTION_TIMER_INTERVAL_MILLIS,
		MILLISECONDS_IN_DAY,
		WALLET_TIMER_INTERVAL_MILLIS
	} from '$lib/constants/app.constants';
	import {
		enabledErc20Tokens,
		enabledErc4626Tokens,
		enabledNonFungibleTokensWithoutSpam
	} from '$lib/derived/tokens.derived';
	import { isRouteActivity, isRouteNfts } from '$lib/utils/nav.utils';

	let fungibleTokens = $derived([
		...$enabledEthereumTokens,
		...$enabledErc20Tokens,
		...$enabledErc4626Tokens,
		...$enabledEvmTokens
	]);

	let nonFungibleTokens = $derived([...$enabledNonFungibleTokensWithoutSpam]);

	// If we are not in NFTs page or Activity page, there is no need to reload NFT transactions frequently.
	// In fact, we can disable it, giving it a very high interval.
	let isNftsPage = $derived(isRouteNfts(page));
	let isActivityPage = $derived(isRouteActivity(page));
	let nftInterval = $derived(
		isNftsPage || isActivityPage ? COLLECTION_TIMER_INTERVAL_MILLIS : MILLISECONDS_IN_DAY
	);
</script>

<LoaderMultipleEthTransactions interval={WALLET_TIMER_INTERVAL_MILLIS} tokens={fungibleTokens} />

<LoaderMultipleEthTransactions interval={nftInterval} tokens={nonFungibleTokens} />
