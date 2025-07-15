<script lang="ts">
	import NFTsDisplayHandler from '$lib/components/nfts/NFTsDisplayHandler.svelte';
	import type { Nft } from '$lib/types/nft';
	import NftCard from '$lib/components/nfts/NftCard.svelte';

	let nfts: Nft[] = $state([]);
</script>

<NFTsDisplayHandler bind:nfts>
	<div class="grid grid-cols-3 gap-4">
		{#each nfts as nft}
			<NftCard {nft}/>
		{/each}
	</div>

</NFTsDisplayHandler>
