<script lang="ts">
	import type { Snippet } from 'svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		title: string;
		icon?: Snippet;
		nfts: Nft[];
	}

	let {title, icon, nfts}: Props = $props();
</script>

{#if nfts.length > 0}
	<div class="flex gap-2 items-center mt-5">
		{@render icon?.()}
		<h5>{title}</h5>
	</div>

	<div class="grid grid-cols-3 gap-3 gap-y-4 py-4">
		{#each nfts as nft, index (`${String(nft.id)}-${index}`)}
			<NftCard {nft} />
		{/each}
	</div>
{/if}