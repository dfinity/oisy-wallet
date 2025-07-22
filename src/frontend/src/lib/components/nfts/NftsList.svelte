<script lang="ts">
	import noNftsBanner from '$lib/assets/nfts/no-nfts-banner.svg';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { NFT_CARD } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft } from '$lib/types/nft';

	let nfts: Nft[] = $state([]);
</script>

<NftsDisplayHandler bind:nfts>
	{#if nfts.length === 0}
		<div class="flex flex-col items-center gap-5 px-6 py-10">
			<Img src={noNftsBanner} alt={$i18n.nfts.alt.placeholder_image} />

			<div class="flex flex-col items-center gap-2">
				<h5>{$i18n.nfts.text.title_empty}</h5>
			</div>
			<span class="text-tertiary">{$i18n.nfts.text.description_empty}</span>
		</div>
	{:else}
		<div class="grid grid-cols-3 gap-4 pt-4">
			{#each nfts as nft, index (`${nft.id}-${index}`)}
				<NftCard {nft} testId={`${NFT_CARD}-${nft.id}`} />
			{/each}
		</div>
	{/if}
</NftsDisplayHandler>
