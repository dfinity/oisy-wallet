<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import type { NftCollectionUi } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		collection: NftCollectionUi;
		disabled?: boolean;
		testId?: string;
	}

	const { collection, disabled, testId }: Props = $props();
</script>

<a
	class="flex w-full flex-col gap-2 p-1 text-left no-underline"
	href={`${AppPath.Nfts}${collection.collection.network.name}-${collection.collection.address}`}
>
	<div
		class="relative grid aspect-square gap-2 overflow-hidden rounded-xl border border-brand-subtle-20 bg-brand-subtle-10 p-1.5 duration-200"
		class:grid-cols-1={collection.nfts.length === 1}
		class:grid-cols-2={collection.nfts.length > 1}
		class:hover:bg-brand-subtle-20={!disabled}
		class:opacity-50={disabled}
	>
		{#each collection.nfts as nft, index (nft.id + index)}
			{#if index < 4 && nonNullish(nft.imageUrl)}
				<div class="relative aspect-square overflow-hidden rounded-lg bg-primary-light">
					<BgImg
						imageUrl={nft?.imageUrl}
						shadow="inset"
						size="contain"
						testId={`${testId}-image-${index}`}
					/>
				</div>
			{/if}
		{/each}

		<span
			class="bg-linear-to-tl -from-100% absolute m-[1px] h-full w-full from-[#382792A6] to-[#00000000] to-45% opacity-35"
		></span>

		<span class="absolute bottom-0 right-0 m-2.5">
			<NetworkLogo
				color="white"
				network={collection.collection.network}
				size="xs"
				testId={`${testId}-network`}
			/>
		</span>
	</div>

	<div class="flex w-full flex-col gap-1">
		<span
			class="truncate text-sm font-bold"
			class:text-disabled={disabled}
			class:text-primary={!disabled}>{collection.collection.name}</span
		>
		<span class="text-xs" class:text-disabled={disabled} class:text-tertiary={!disabled}
			>{replacePlaceholders($i18n.nfts.text.collection_items_count, {
				$count: String(collection.nfts.length)
			})}</span
		>
	</div>
</a>
