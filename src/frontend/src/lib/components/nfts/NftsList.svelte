<script lang="ts">
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import type { Nft, NftCollectionUi } from '$lib/types/nft';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
	import { nftListStore } from '$lib/stores/nft-list.store';

	let nfts: Nft[] = $state([]);
	let nftCollections: NftCollectionUi[] = $state([]);

	$effect(() => {
		console.log(nftCollections);
	});
</script>

<NftsDisplayHandler bind:nfts bind:nftCollections>
	{#if $nftListStore.groupByCollection}
		{#if nftCollections.length === 0}
			<EmptyNftsList />
		{:else}
			<div class="grid grid-cols-3 gap-2 gap-y-4 pt-4">
				{#each nftCollections as collection, index (`${String(collection.collection.id)}-${index}`)}
					{#if collection.nfts.length > 0}
						<NftCollectionCard {collection} />
					{/if}
				{/each}
			</div>
		{/if}
	{:else if nftCollections.length === 0}
		<EmptyNftsList />
	{:else}
		<div class="grid grid-cols-3 gap-2 gap-y-4 pt-4">
			{#each nfts as nft, index (`${String(nft.id)}-${index}`)}
				<NftCard {nft} />
			{/each}
		</div>
	{/if}
</NftsDisplayHandler>
