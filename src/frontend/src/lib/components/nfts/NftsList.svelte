<script lang="ts">
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import { NFT_CARD } from '$lib/constants/test-ids.constants';
	import type { Nft, NftCollection } from '$lib/types/nft';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';

	let nfts: Nft[] = $state([]);
	let nftCollections: NftCollection[] = $state([]);
</script>

<NftsDisplayHandler bind:nfts bind:nftCollections>
	{#if nftCollections.length === 0}
		<EmptyNftsList />
	{:else}
		<div class="grid grid-cols-3 gap-4 pt-4">
			{#each nftCollections as collection, index (`${String(collection.id)}-${index}`)}
				<NftCollectionCard {collection} />
			{/each}
		</div>
	{/if}
</NftsDisplayHandler>
