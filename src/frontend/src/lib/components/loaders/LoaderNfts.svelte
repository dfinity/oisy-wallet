<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { getIdbAllNfts, setIdbAllNfts } from '$lib/api/idb-nfts.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { loadNftsByNetwork } from '$lib/services/nft.services';
	import { nftStore } from '$lib/stores/nft.store';
	import { getTokensByNetwork } from '$lib/utils/nft.utils';

	let nftCacheLoaded = $state(false);

	const loadCachedNfts = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const cachedNfts = await getIdbAllNfts($authIdentity.getPrincipal());

		if (isNullish(cachedNfts) || cachedNfts.length === 0) {
			nftCacheLoaded = true;

			return;
		}

		nftStore.addAll(cachedNfts);

		nftCacheLoaded = true;
	};

	const onLoad = async () => {
		if (!nftCacheLoaded) {
			await loadCachedNfts();
		}

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

	$effect(() => {
		if (nftCacheLoaded && nonNullish($nftStore)) {
			// TODO: Needs to parse symbols properly before storing
			setIdbAllNfts({
				identity: $authIdentity,
				nfts: $nftStore
			});
		}
	});
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad} skipInitialLoad={true} />
