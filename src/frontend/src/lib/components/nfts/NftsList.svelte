<script lang="ts">
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftCardSkeleton from '$lib/components/nfts/NftCardSkeleton.svelte';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftListStore } from '$lib/stores/nft-list.store';
	import type { Nft, NftCollectionUi } from '$lib/types/nft';

	let nfts: Nft[] = $state([]);
	let nftCollections: NftCollectionUi[] = $state([]);
</script>

<NftsDisplayHandler bind:nfts bind:nftCollections>
	{#if $nftListStore.groupByCollection}
		{#if nftCollections.length === 0}
			<EmptyNftsList />
		{:else}
			<h5 class="mt-5">{$i18n.nfts.text.collections}</h5>
			<div class="grid grid-cols-3 gap-3 gap-y-4 py-4">
				{#if nftCollections.filter((c) => c.nfts.length > 0).length > 0}
					{#each nftCollections as collection, index (`${String(collection.collection.id)}-${index}`)}
						{#if collection.nfts.length > 0}
							<NftCollectionCard {collection} />
						{/if}
					{/each}
				{:else}
					<NftCardSkeleton />
					<NftCardSkeleton />
					<NftCardSkeleton />
				{/if}
			</div>
		{/if}
	{:else if nftCollections.length === 0}
		<EmptyNftsList />
	{:else}
		<h5 class="mt-5">{$i18n.nfts.text.all_assets}</h5>
		<div class="grid grid-cols-3 gap-3 gap-y-4 py-4">
			{#each nfts as nft, index (`${String(nft.id)}-${index}`)}
				<NftCard {nft} />
			{/each}
		</div>
	{/if}
</NftsDisplayHandler>
