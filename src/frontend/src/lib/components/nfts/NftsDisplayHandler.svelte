<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enabledNonFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { Nft, NftCollectionUi } from '$lib/types/nft';
	import {
		filterSortByCollection,
		getEnabledNfts,
		getNftCollectionUi
	} from '$lib/utils/nfts.utils';
	import { nftSortStore } from '$lib/stores/settings.store';

	interface Props {
		children: Snippet;
		nfts: Nft[];
		nftCollections: NftCollectionUi[];
	}

	let { children, nfts = $bindable([]), nftCollections = $bindable([]) }: Props = $props();

	$effect(() => {
		nfts = filterSortByCollection({
			items: getEnabledNfts({ $nftStore, $enabledNonFungibleNetworkTokens }),
			filter: $tokenListStore.filter,
			sort: $nftSortStore
		});
		nftCollections = filterSortByCollection({
			items: getNftCollectionUi({
				$nftStore,
				$nonFungibleTokens: $enabledNonFungibleNetworkTokens
			}),
			filter: $tokenListStore.filter,
			sort: $nftSortStore
		});
	});
</script>

{@render children()}
