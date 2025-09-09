<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		nftListItem: Snippet<[{ nft: Nft }]>;
		title?: string;
		icon?: Snippet;
		nfts: Nft[];
		testId?: string;
	}

	let { nftListItem, title, icon, nfts, testId }: Props = $props();
</script>

{#if nfts.length > 0}
	<div data-tid={testId}>
		{#if nonNullish(title)}
			<div class="mt-5 flex items-center gap-2">
				{@render icon?.()}
				<h5>{title}</h5>
			</div>
		{/if}

		<div class="grid grid-cols-2 gap-3 gap-y-4 py-4 md:grid-cols-3">
			{#each nfts as nft, index (`${String(nft.id)}-${index}`)}
				{@render nftListItem({ nft })}
			{/each}
		</div>
	</div>
{/if}
