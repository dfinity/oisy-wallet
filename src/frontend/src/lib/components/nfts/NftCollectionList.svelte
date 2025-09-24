<script lang="ts">
	import type { Snippet } from 'svelte';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
	import type { NftCollectionUi } from '$lib/types/nft';
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';

	interface Props {
		title: string;
		isMain?: boolean;
		icon?: Snippet;
		nftCollections: NftCollectionUi[];
		testId?: string;
	}

	let { title, isMain = false, icon, nftCollections, testId }: Props = $props();

	const notEmptyCollections = $derived(nftCollections.filter((c) => c.nfts.length > 0));
</script>

	<div data-tid={testId}>
		{#if notEmptyCollections.length > 0 || isMain}
			<div class="mt-2 flex items-center gap-2">
				{@render icon?.()}
				<h5>{title}</h5>
			</div>
		{/if}

		{#if notEmptyCollections.length > 0}
			<div class="grid grid-cols-2 gap-3 gap-y-4 py-4 md:grid-cols-3">
				{#each notEmptyCollections as collection, index (`${String(collection.collection.id)}-${index}`)}
					<NftCollectionCard {collection} />
				{/each}
			</div>
		{:else if isMain}
			<EmptyNftsList hideDescription />
		{/if}
	</div>
