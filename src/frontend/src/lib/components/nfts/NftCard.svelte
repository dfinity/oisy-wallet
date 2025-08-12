<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { goto } from '$app/navigation';
	import { AppPath } from '$lib/constants/routes.constants';

	interface Props {
		nft: Nft;
		testId?: string;
	}

	let { nft, testId }: Props = $props();
</script>

<button
	class="flex-col text-left"
	data-tid={testId}
	onclick={() => goto(AppPath.Nfts + nft.collection.symbol + '/' + nft.id)}
>
	<div class="relative overflow-hidden rounded-xl">
		{#if nonNullish(nft.imageUrl)}
			<Img
				src={nft.imageUrl}
				alt={replacePlaceholders($i18n.nfts.alt.card.image, {
					$tokenId: nft.id.toString()
				})}
				styleClass="h-48 object-contain bg-black"
				testId={`${testId}-image`}
			/>
		{:else}
			<div class="bg-black/16 h-48 rounded-lg" data-tid={`${testId}-placeholder`}></div>
		{/if}

		<div class="absolute bottom-2 right-2 flex items-center gap-1">
			{#if nonNullish(nft.balance)}
				<Badge variant="outline" testId={`${testId}-balance`}>{nft.balance}x</Badge>
			{/if}

			<NetworkLogo
				network={nft.collection.network}
				size="xs"
				color="white"
				testId={`${testId}-network`}
			/>
		</div>
	</div>

	<div class="w-full px-2 pt-2">
		<h3 class="truncate text-xs font-semibold text-tertiary">{nft.collection.name}</h3>
		<span class="text-xs text-tertiary">{`#${nft.id}`}</span>
	</div>
</button>
