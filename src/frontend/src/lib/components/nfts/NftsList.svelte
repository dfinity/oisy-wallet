<script lang="ts">
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import { NFT_CARD } from '$lib/constants/test-ids.constants';
	import type { Nft, NftCollection, NftCollectionUi } from '$lib/types/nft';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';

	let nfts: Nft[] = $state([]);
	let nftCollections: NftCollectionUi[] = $state([]);

	let group = $state(false);
</script>

<NftsDisplayHandler bind:nfts bind:nftCollections>
	<button onclick={() => (group = !group)}>{group ? 'ungroup' : 'group'}</button>

	{#if group}
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
			{#each nfts as nft, index (nft.id)}
				<NftCard {nft} />
			{/each}
		</div>
	{/if}
</NftsDisplayHandler>
