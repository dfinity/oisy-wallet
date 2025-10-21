<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
	import type { NftCollectionUi } from '$lib/types/nft';

	interface Props {
		title: string;
		asMainSection?: boolean;
		icon?: Snippet;
		nftCollections: NftCollectionUi[];
		testId?: string;
		fromRoute: NavigationTarget | null;
	}

	let { title, asMainSection = false, icon, nftCollections, testId, fromRoute }: Props = $props();

	const notEmptyCollections = $derived(nftCollections.filter((c) => c.nfts.length > 0));
</script>

<div data-tid={testId}>
	{#if notEmptyCollections.length > 0 || asMainSection}
		<div class="mt-2 flex items-center gap-2">
			{@render icon?.()}
			<h5>{title}</h5>
		</div>

		{#if notEmptyCollections.length > 0}
			<div class="grid grid-cols-2 gap-3 gap-y-4 py-4 md:grid-cols-3">
				{#each notEmptyCollections as collection, index (`${String(collection.collection.id)}-${index}`)}
					<NftCollectionCard {collection} {fromRoute} />
				{/each}
			</div>
		{:else}
			<EmptyNftsList hideDescription />
		{/if}
	{/if}
</div>
