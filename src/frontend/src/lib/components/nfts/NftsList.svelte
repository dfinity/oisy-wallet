<script lang="ts">
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import { NFT_CARD } from '$lib/constants/test-ids.constants';
	import type { Nft } from '$lib/types/nft';

	let nfts: Nft[] = $state([]);
</script>

<NftsDisplayHandler bind:nfts>
	<div class="grid grid-cols-3 gap-4 pt-4">
		{#each nfts as nft, index (`${nft.id}-${index}`)}
			<NftCard {nft} testId={`${NFT_CARD}_${nft.id}`} />
		{/each}
	</div>
</NftsDisplayHandler>
