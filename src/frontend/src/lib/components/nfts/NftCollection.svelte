<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftCollectionHero from '$lib/components/nfts/NftCollectionHero.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { nftStore } from '$lib/stores/nft.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Nft, NftCollection } from '$lib/types/nft';
	import { i18n } from '$lib/stores/i18n.store';

	const [collectionId, networkId] = $derived([page.params.collectionId, page.params.networkId]);

	const collectionNfts: Nft[] = $derived(
		($nftStore ?? []).filter(
			(c) => c.collection.address === collectionId && c.collection.network.name === networkId
		)
	);

	const collection: NftCollection | undefined = $derived(collectionNfts?.[0]?.collection);

	// redirect to assets page if collection cant be loaded within 10s
	let timeout: NodeJS.Timeout | undefined = $state();

	onMount(() => {
		timeout = setTimeout(() => {
			if (isNullish(collection)) {
				goto(AppPath.Nfts, { replaceState: false });
				toastsError({ msg: { text: $i18n.nfts.text.collection_not_loaded } });
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
