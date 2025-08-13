<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enabledNonFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NftCollection, Nft, NftCollectionUi } from '$lib/types/nft';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { getEnabledNfts, getNftCollectionUi } from '$lib/utils/nfts.utils';

	interface Props {
		children: Snippet;
		nfts: Nft[];
		nftCollections: NftCollectionUi[];
	}

	let { children, nfts = $bindable([]), nftCollections = $bindable([]) }: Props = $props();

	$effect(() => {
		nfts = getEnabledNfts({ $nftStore, $enabledNonFungibleNetworkTokens });
		nftCollections = getNftCollectionUi({ $nftStore, $nonFungibleTokens });
	});
</script>

{@render children()}
