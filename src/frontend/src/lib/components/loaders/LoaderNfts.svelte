<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { MILLISECONDS_IN_DAY, NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { loadNftsByNetwork } from '$lib/services/nft.services';
	import { nftStore } from '$lib/stores/nft.store';
	import { isRouteActivity, isRouteNfts } from '$lib/utils/nav.utils';
	import { getTokensByNetwork } from '$lib/utils/nft.utils';

	const onLoad = async () => {
		const tokensByNetwork = getTokensByNetwork($enabledNonFungibleTokens);

		const promises = Array.from(tokensByNetwork).map(async ([networkId, tokens]) => {
			const nfts = await loadNftsByNetwork({
				networkId,
				tokens,
				identity: $authIdentity,
				ethAddress: $ethAddress
			});

			nftStore.setAllByNetwork({ networkId, nfts });
		});

		await Promise.allSettled(promises);
	};

	const debounceLoad = debounce(onLoad);

	$effect(() => {
		[$enabledNonFungibleTokens, $authIdentity, $ethAddress];

		untrack(() => debounceLoad());
	});

	// If we are not in NFTs page or Activity page, there is no need to reload NFTs frequently.
	// In fact, we can disable it, giving it a very high interval.
	let isNftsPage = $derived(isRouteNfts(page));
	let isActivityPage = $derived(isRouteActivity(page));
	let interval = $derived(
		isNftsPage || isActivityPage ? NFT_TIMER_INTERVAL_MILLIS : MILLISECONDS_IN_DAY
	);
</script>

<IntervalLoader {interval} {onLoad} skipInitialLoad={true} />
