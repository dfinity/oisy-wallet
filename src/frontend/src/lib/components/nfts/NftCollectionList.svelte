<script lang="ts">
	import type { Snippet } from 'svelte';
	import NftCardSkeleton from '$lib/components/nfts/NftCardSkeleton.svelte';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
	import type { NftCollectionUi } from '$lib/types/nft';

	interface Props {
		title: string;
		icon?: Snippet;
		nftCollections: NftCollectionUi[];
		testId?: string;
	}

	let { title, icon, nftCollections, testId }: Props = $props();
</script>

{#if nftCollections.length > 0}
	<div data-tid={testId}>
		<div class="mt-2 flex items-center gap-2">
			{@render icon?.()}
			<h5>{title}</h5>
		</div>

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
	</div>
{/if}
