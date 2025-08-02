<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		nft: Nft;
		testId?: string;
	}

	let { nft, testId }: Props = $props();
</script>

<div data-tid={testId}>
	<div class="relative overflow-hidden rounded-lg">
		{#if nonNullish(nft.imageUrl)}
			<Img
				src={nft.imageUrl}
				alt={replacePlaceholders($i18n.nfts.alt.card.image, {
					$tokenId: nft.id.toString()
				})}
				testId={`${testId}-image`}
			/>
		{:else}
			<div class="bg-black/16 h-48 rounded-lg" data-tid={`${testId}-placeholder`}></div>
		{/if}

		<div class="absolute bottom-2 right-2">
			<NetworkLogo
				network={nft.contract.network}
				size="xs"
				color="white"
				testId={`${testId}-network`}
			/>
		</div>
	</div>

	<div class="px-2 pt-2">
		<h3 class="text-xs font-semibold text-tertiary">{nft.contract.name}</h3>
		<span class="text-xs text-tertiary">{`#${nft.id}`}</span>
	</div>
</div>
