<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import type { Nft } from '$lib/types/nft';
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';

	interface Props {
		nftListItem: Snippet<[{ nft: Nft }]>;
		title?: string;
		icon?: Snippet;
		nfts: Nft[];
		testId?: string;
		isMain?: boolean;
	}

	let { nftListItem, title, icon, nfts, testId, isMain = false }: Props = $props();
</script>

<div data-tid={testId}>
	{#if nonNullish(title) && (nfts.length > 0 || isMain)}
		<div class="mt-5 flex items-center gap-2">
			{@render icon?.()}
			<h5>{title}</h5>
		</div>
	{/if}

	{#if nfts.length > 0}
		<div class="grid grid-cols-2 gap-3 gap-y-4 py-4 md:grid-cols-3">
			{#each nfts as nft, index (`${nft.id}-${index}`)}
				{@render nftListItem({ nft })}
			{/each}
		</div>
	{:else if isMain}
		<EmptyNftsList hideDescription />
	{/if}
</div>
