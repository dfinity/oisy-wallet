<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import Img from '$lib/components/ui/Img.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import type { Nft } from '$lib/types/nft';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';

	interface Props {
		nft?: Nft;
	}

	const { nft }: Props = $props();
</script>

{#if nonNullish(nft?.description) || isNullish(nft)}
	<div class="mt-5 flex rounded-lg bg-primary p-5">
		{#if nonNullish(nft)}
			<div class="grow-1 flex flex-col">
				{#if nonNullish(nft.name)}
					<h5 class="mb-3">{nft.name}</h5>
				{/if}
				{#if nonNullish(nft.description)}
					<p class="text-sm">{nft.description}</p>
				{/if}
			</div>

			{#if nonNullish(nft.imageUrl)}
				<div class="ml-3 max-w-16 grow-0 self-start overflow-hidden rounded-lg">
					<NftImageConsent type="nft-display" showMessage={false} {nft}>
						<Img src={nft.imageUrl} />
					</NftImageConsent>
				</div>
			{/if}
		{:else}
			<span class="w-full">
				<span class="mb-2 block"><SkeletonText /></span>
				<span class="mb-2 block max-w-[90%]"><SkeletonText /></span>
				<span><SkeletonText /></span>
			</span>
		{/if}
	</div>
{/if}
