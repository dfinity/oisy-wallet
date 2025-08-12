<script lang="ts">
	import type { NftCollectionUi } from '$lib/types/nft';
	import Img from '$lib/components/ui/Img.svelte';
	import { nonNullish } from '@dfinity/utils';

	interface Props {
		collection: NftCollectionUi;
	}

	const { collection }: Props = $props();

	console.log(collection);
</script>

<a href="#" class="flex w-full flex-col gap-2 p-1 no-underline">
	<div
		class="relative grid aspect-square grid-cols-2 gap-2 overflow-hidden rounded-lg border border-brand-subtle-20 bg-brand-subtle-10 p-1.5 duration-200 hover:bg-brand-subtle-20"
	>
		{#each collection.nfts as nft, index}
			{#if index < 4 && nonNullish(nft.imageUrl)}
				<div class="aspect-square overflow-hidden rounded-md">
					<Img src={nft.imageUrl} />
				</div>
			{/if}
		{/each}

		<span
			style="background: linear-gradient(-45deg, #382792A6 -100%, rgba(0, 0, 0, 0) 35%);"
			class="absolute m-[1px] h-full w-full"
		></span>
	</div>

	<div class="flex flex-col gap-1">
		<span class="text-sm font-bold text-primary">{collection.collection.name}</span>
		<span class="text-xs text-tertiary">{collection.nfts.length} items</span>
	</div>
</a>
