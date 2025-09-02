<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NftCollectionUi } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	interface Props {
		collection: NftCollectionUi;
		disabled?: boolean;
		testId?: string;
	}

	const { collection, disabled, testId }: Props = $props();
</script>

<a
	class="group flex w-full flex-col gap-2 rounded-xl text-left no-underline transition-all duration-300"
	class:cursor-not-allowed={disabled}
	class:hover:-translate-y-1={!disabled}
	class:hover:bg-primary={!disabled}
	href={`${AppPath.Nfts}${collection.collection.network.name}-${collection.collection.address}`}
>
	<div class="relative h-full w-full">
		<NftImageConsent nft={collection.nfts[0]} type="card">
			<div
				class="relative grid aspect-square gap-2 overflow-hidden rounded-xl border border-brand-subtle-20 bg-brand-subtle-10 p-1.5"
				class:grid-cols-1={collection.nfts.length === 1}
				class:grid-cols-2={collection.nfts.length > 1}
				class:opacity-50={disabled}
			>
				<span
					class="bg-linear-to-tl -from-100% z-1 absolute m-[1px] h-full w-full from-[#382792A6] to-[#00000000] to-45% opacity-20"
				>
				</span>
				<span class="absolute z-0 h-full w-full bg-secondary-alt"></span>

				{#each collection.nfts as nft, index (nft.id + index)}
					{#if index < 4 && nonNullish(nft.imageUrl)}
						<div class="relative aspect-square overflow-hidden rounded-lg bg-secondary-alt">
							<BgImg
								imageUrl={nft?.imageUrl}
								shadow="inset"
								size="cover"
								styleClass="group-hover:scale-110 transition-transform duration-300 ease-out"
								testId={`${testId}-image-${index}`}
							/>
						</div>
					{/if}
				{/each}
			</div>
		</NftImageConsent>

		<span class="absolute bottom-0 right-0 m-2.5">
			<NetworkLogo
				color="white"
				network={collection.collection.network}
				size="xs"
				testId={`${testId}-network`}
			/>
		</span>
	</div>

	<div class="flex w-full flex-col gap-1 px-2 pb-2">
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
