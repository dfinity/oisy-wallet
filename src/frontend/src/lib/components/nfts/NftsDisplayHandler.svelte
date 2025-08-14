<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enabledNonFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { nftListStore } from '$lib/stores/nft-list.store';
	import { nftStore } from '$lib/stores/nft.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { Nft, NftCollectionUi } from '$lib/types/nft';
	import {
		filterSortNftCollections,
		getEnabledNfts,
		getNftCollectionUi
	} from '$lib/utils/nfts.utils';
	import { filterSortNfts } from '$lib/utils/nfts.utils.js';

	interface Props {
		children: Snippet;
		nfts: Nft[];
		nftCollections: NftCollectionUi[];
	}

	let { children, nfts = $bindable([]), nftCollections = $bindable([]) }: Props = $props();

	$effect(() => {
		nfts = filterSortNfts({
			nfts: getEnabledNfts({ $nftStore, $enabledNonFungibleNetworkTokens }),
			filter: $tokenListStore.filter,
			sort: $nftListStore.sort
		});
		nftCollections = filterSortNftCollections({
			nftCollections: getNftCollectionUi({ $nftStore, $nonFungibleTokens }),
			filter: $tokenListStore.filter,
			sort: $nftListStore.sort
		});
	});
</script>

{@render children()}
