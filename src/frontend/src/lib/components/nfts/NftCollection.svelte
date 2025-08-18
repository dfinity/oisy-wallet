<script lang="ts">
	import { page } from '$app/stores';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftCollectionHero from '$lib/components/nfts/NftCollectionHero.svelte';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft, NftCollection } from '$lib/types/nft';
	import { onMount } from 'svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants';
	import { toastsError } from '$lib/stores/toasts.store';

	const collectionId = $derived($page.params.collectionId);

	const collectionNfts: Nft[] = $derived(
		($nftStore ?? []).filter((c) => c.collection.address === collectionId)
	);

	const collection: NftCollection | undefined = $derived(collectionNfts?.[0]?.collection);

	let timeout: NodeJS.Timeout | undefined = $state();

	onMount(() => {
		timeout = setTimeout(() => {
			if (isNullish(collection)) {
				goto(AppPath.Nfts);
				toastsError({ msg: { text: 'Could not load collection' } });
			}
		}, 10000);

		return () => {
			if (nonNullish(timeout)) {
				clearTimeout(timeout);
			}
		};
	});
</script>

<NftCollectionHero {collection} nfts={collectionNfts} />

<div class="mt-4 grid grid-cols-3 gap-2 gap-y-4 pt-4">
	{#each collectionNfts as nft, index (nft.id + index)}
		<NftCard {nft} />
	{/each}
</div>
