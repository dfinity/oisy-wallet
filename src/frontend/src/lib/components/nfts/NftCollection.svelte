<script lang="ts">
	import { page } from '$app/stores';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftCollectionHero from '$lib/components/nfts/NftCollectionHero.svelte';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft } from '$lib/types/nft';

	const collectionId = $derived($page.params.collectionId);

	const collectionNfts: Nft[] = $derived(
		($nftStore ?? []).filter((c) => c.collection.address === collectionId)
	);
</script>

<NftCollectionHero collection={collectionNfts?.[0]?.collection} nfts={collectionNfts} />

<div class="mt-4 grid grid-cols-3 gap-2 gap-y-4 pt-4">
	{#each collectionNfts as nft, index (nft.id + index)}
		<NftCard {nft} />
	{/each}
</div>
