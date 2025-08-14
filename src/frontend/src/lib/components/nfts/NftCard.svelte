<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		nft: Nft;
		testId?: string;
		disabled?: boolean;
	}

	let { nft, testId, disabled }: Props = $props();
</script>

<a
	class="flex w-full flex-col gap-2 p-1 text-left no-underline"
	data-tid={testId}
	href={`${AppPath.Nfts + nft.collection.address  }/${  nft.id}`}
>
	<div class="relative aspect-square overflow-hidden rounded-xl">
		{#if nonNullish(nft.imageUrl)}
			<Img
				src={nft.imageUrl}
				alt={replacePlaceholders($i18n.nfts.alt.card.image, {
					$tokenId: nft.id.toString()
				})}
				styleClass="object-contain"
				testId={`${testId}-image`}
			/>
		{:else}
			<div class="bg-black/16 rounded-lg" data-tid={`${testId}-placeholder`}></div>
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

	<div class="flex w-full flex-col gap-1">
		<span
			class="truncate text-sm font-bold"
			class:text-primary={!disabled}
			class:text-disabled={disabled}>{nft.collection.name}</span
		>
		<span class="text-xs" class:text-tertiary={!disabled} class:text-disabled={disabled}
			>#{nft.id}</span
		>
	</div>
</a>
