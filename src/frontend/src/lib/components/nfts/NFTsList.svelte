<script lang="ts">
	import NFTsDisplayHandler from '$lib/components/nfts/NFTsDisplayHandler.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import { NFT_CARD } from '$lib/constants/test-ids.constants';
	import type { Nft } from '$lib/types/nft';

	let nfts: Nft[] = $state([]);

	// $effect(() => {
	// 	console.log(nfts)
	// })
</script>

<NFTsDisplayHandler bind:nfts>
	<div class="grid grid-cols-3 gap-4">
		{#each nfts as nft, index (`${nft.id}-${index}`)}
			<NftCard {nft} testId={`${NFT_CARD}_${nft.id}`} />
		{/each}
	</div>
</NFTsDisplayHandler>
