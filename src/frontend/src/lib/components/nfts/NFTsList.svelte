<script lang="ts">
	import NFTsDisplayHandler from '$lib/components/nfts/NFTsDisplayHandler.svelte';
	import type { Nft } from '$lib/types/nft';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import { NFT_CARD } from '$lib/constants/test-ids.constants';

	let nfts: Nft[] = $state([]);
</script>

<NFTsDisplayHandler bind:nfts>
	<div class="grid grid-cols-3 gap-4">
		{#each nfts as nft}
			<NftCard {nft} testId={`${NFT_CARD}_${nft.id}`}/>
		{/each}
	</div>

</NFTsDisplayHandler>
