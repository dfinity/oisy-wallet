<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { Nft } from '$lib/types/nft';
	import Img from '$lib/components/ui/Img.svelte';

	interface Props {
		nft?: Nft;
	}

	const { nft }: Props = $props();
</script>

{#if (nonNullish(nft) && nonNullish(nft.description)) || isNullish(nft)}
	<div class="mt-5 flex rounded-lg bg-primary p-5">
		{#if nonNullish(nft)}
			<div class="flex flex-col">
				{#if nonNullish(nft.name)}
					<h5 class="mb-3">{nft.name}</h5>
				{/if}
				{#if nonNullish(nft.name)}
					<p class="text-sm">{nft.description}</p>
				{/if}
			</div>

			{#if nonNullish(nft.imageUrl)}
				<div class="ml-3 max-w-16 grow-0 self-start overflow-hidden rounded-lg">
					<Img src={nft.imageUrl} />
				</div>
			{/if}
		{:else}
			<SkeletonText />
		{/if}
	</div>
{/if}
