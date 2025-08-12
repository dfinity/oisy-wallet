<script lang="ts">
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import { NFT_CARD } from '$lib/constants/test-ids.constants';
	import type { Nft, NftCollection, NftCollectionUi } from '$lib/types/nft';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';

	let nfts: Nft[] = $state([]);
	let nftCollections: NftCollectionUi[] = $state([]);
</script>

<NftsDisplayHandler bind:nfts bind:nftCollections>
	{#if nftCollections.length === 0}
		<EmptyNftsList />
	{:else}
		<div class="grid grid-cols-3 gap-2 gap-y-4 pt-4">
			{#each nftCollections as collection, index (`${String(collection.collection.id)}-${index}`)}
				<NftCollectionCard {collection} />
				<NftCollectionCard {collection} />
				<NftCollectionCard {collection} />
				<NftCollectionCard {collection} />
			{/each}
		</div>
	{/if}
</NftsDisplayHandler>
