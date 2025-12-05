<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import NftDisplayGuard from '$lib/components/nfts/NftDisplayGuard.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_SOURCES,
		PLAUSIBLE_EVENT_VALUES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftSortStore } from '$lib/stores/settings.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { NftCollectionUi } from '$lib/types/nft';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';
	import { nftsUrl } from '$lib/utils/nav.utils';
	import { getNftDisplayImageUrl, getNftDisplayMediaStatus } from '$lib/utils/nft.utils';
	import { filterSortByCollection } from '$lib/utils/nfts.utils';

	interface Props {
		collection: NftCollectionUi;
		isHidden?: boolean;
		isSpam?: boolean;
		disabled?: boolean;
		testId?: string;
	}

	const { collection, isHidden, isSpam, disabled, testId }: Props = $props();

	const collectionNfts = $derived(
		filterSortByCollection({
			items: collection.nfts,
			filter: $tokenListStore.filter,
			sort: $nftSortStore
		})
	);

	const previewNft = $derived(
		collection.nfts.find((nft) =>  getNftDisplayMediaStatus( nft) !== NftMediaStatusEnum.OK) ?? collection.nfts[0]
	);

	const onClick = () => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_value: PLAUSIBLE_EVENT_VALUES.NFT_COLLECTION_PAGE,
				location_source: PLAUSIBLE_EVENT_SOURCES.NAVIGATION,
				token_network: previewNft.collection.network.name,
				token_address: previewNft.collection.address,
				token_symbol: previewNft.collection.symbol ?? '',
				token_name: previewNft.collection.name ?? ''
			}
		});

		if (collection.nfts.length === 1) {
			goto(nftsUrl({ nft: collection.nfts[0] }));
			return;
		}
		goto(nftsUrl({ collection: collection.collection }));
	};
</script>

<button
	class="group flex w-full flex-col gap-2 rounded-xl text-left no-underline transition-all duration-300"
	class:cursor-not-allowed={disabled}
	class:hover:-translate-y-1={!disabled}
	class:hover:bg-primary={!disabled}
	onclick={onClick}
>
	<span class="relative block h-full w-full">
		<NftDisplayGuard
			location={{
				source: PLAUSIBLE_EVENT_SOURCES.NFTS_PAGE,
				subSource: 'card'
			}}
			nft={previewNft}
			type="card"
		>
			<div
				class="relative grid aspect-square gap-2 overflow-hidden rounded-xl border border-brand-subtle-20 bg-brand-subtle-10 p-1.5"
				class:grid-cols-1={collection.nfts.length === 1}
				class:grid-cols-2={collection.nfts.length > 1}
				class:opacity-50={disabled}
			>
				<span
					class="-from-100% absolute z-1 m-[1px] h-full w-full bg-linear-to-tl from-[#382792A6] to-[#00000000] to-45% opacity-20"
				>
				</span>
				<span class="absolute z-0 h-full w-full bg-secondary-alt"></span>

				{#each collectionNfts as nft, index (`${nft.id}-${index}`)}
					{@const nftDisplayImageUrl = getNftDisplayImageUrl(nft)}

					{#if index < 4 && nonNullish(nftDisplayImageUrl)}
						<div class="relative aspect-square overflow-hidden rounded-lg bg-secondary-alt">
							<BgImg
								imageUrl={nftDisplayImageUrl}
								shadow="inset"
								size="cover"
								styleClass="group-hover:scale-110 transition-transform duration-300 ease-out"
								testId={`${testId}-image-${index}`}
							/>
						</div>
					{/if}
				{/each}
			</div>
		</NftDisplayGuard>

		<span class="absolute right-0 bottom-0 m-2.5">
			<NetworkLogo
				color="white"
				network={collection.collection.network}
				size="xs"
				testId={`${testId}-network`}
			/>
		</span>

		{#if isHidden}
			<div class="absolute top-2 left-2 invert dark:invert-0">
				<IconEyeOff size="24" />
			</div>
		{/if}

		{#if isSpam}
			<div class="absolute top-2 left-2 text-warning-primary">
				<IconAlertOctagon size="24" />
			</div>
		{/if}
	</span>

	<span class="flex w-full flex-col gap-1 px-2 pb-2">
		<span
			class="truncate text-sm font-bold"
			class:text-disabled={disabled}
			class:text-primary={!disabled}>{collection.collection.name}</span
		>
		<span class="truncate text-xs" class:text-disabled={disabled} class:text-tertiary={!disabled}
			>{replacePlaceholders($i18n.nfts.text.collection_items_count, {
				$count: String(collection.nfts.length)
			})}</span
		>
	</span>
</button>
