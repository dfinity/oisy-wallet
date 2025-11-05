<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import { isCollectionErc1155 } from '$eth/utils/erc1155.utils';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import NftDisplayGuard from '$lib/components/nfts/NftDisplayGuard.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import type { NFT_COLLECTION_ROUTE } from '$lib/constants/analytics.constants';
	import { NFT_LIST_ROUTE } from '$lib/constants/analytics.constants.js';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_SOURCES,
		PLAUSIBLE_EVENT_VALUES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import type { Nft } from '$lib/types/nft';
	import { nftsUrl } from '$lib/utils/nav.utils';

	interface Props {
		nft: Nft;
		testId?: string;
		disabled?: boolean;
		isHidden?: boolean;
		isSpam?: boolean;
		type?: 'default' | 'card-selectable' | 'card-link';
		onSelect?: (nft: Nft) => void;
		source?: 'default' | typeof NFT_LIST_ROUTE | typeof NFT_COLLECTION_ROUTE;
		withCollectionLabel?: boolean;
	}

	let {
		nft,
		testId,
		disabled,
		isHidden,
		isSpam,
		type = 'default',
		onSelect,
		source = 'default',
		withCollectionLabel = false
	}: Props = $props();

	const onClick = () => {
		if (type === 'card-selectable' && nonNullish(onSelect) && !disabled) {
			onSelect(nft);
		}
		if (type === 'card-link' && !disabled) {
			trackEvent({
				name: PLAUSIBLE_EVENTS.PAGE_OPEN,
				metadata: {
					event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
					event_value: PLAUSIBLE_EVENT_VALUES.NFT_PAGE,
					location_source: PLAUSIBLE_EVENT_SOURCES.NAVIGATION,
					token_network: nft.collection.network.name,
					token_address: nft.collection.address,
					token_symbol: nft.collection.symbol ?? '',
					token_name: nft.name ?? '',
					token_id: nft.id
				}
			});

			goto(nftsUrl({ nft }));
		}
	};
</script>

<button
	class="flex w-full flex-col gap-2 rounded-xl text-left no-underline transition-all duration-300 hover:text-inherit"
	class:bg-primary={type === 'default'}
	class:cursor-default={type === 'default'}
	class:cursor-not-allowed={disabled}
	class:group={type !== 'default'}
	class:hover:-translate-y-1={!disabled && type !== 'default'}
	class:hover:bg-primary={!disabled && type !== 'default'}
	data-tid={testId}
	onclick={onClick}
>
	<span
		class="relative block h-full w-full aspect-square overflow-hidden rounded-xl bg-secondary-alt"
		class:opacity-50={disabled}
	>
		<NftDisplayGuard
			location={{
				source:
					source === NFT_LIST_ROUTE
						? PLAUSIBLE_EVENT_SOURCES.NFTS_PAGE
						: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION,
				subSource: 'card'
			}}
			{nft}
			type={type !== 'card-link' ? 'card-selectable' : 'card'}
		>
			<div class="h-full w-full">
				<BgImg
					imageUrl={nft?.imageUrl}
					shadow="inset"
					size="cover"
					styleClass="group-hover:scale-110 transition-transform duration-300 ease-out"
					testId={`${testId}-image`}
				/>
			</div>
		</NftDisplayGuard>

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

		<span class="absolute right-2 bottom-2 block flex items-center gap-1">
			{#if isCollectionErc1155(nft.collection) && type !== 'default'}
				<Badge testId={`${testId}-balance`} variant="outline">{nft.balance}x</Badge>
			{/if}

			<NetworkLogo
				color="white"
				network={nft.collection.network}
				size="xs"
				testId={`${testId}-network`}
			/>
		</span>
	</span>

	<span class="flex w-full flex-col gap-1 px-2 pb-2" class:text-disabled={disabled}>
		<span class="truncate text-sm font-bold" class:text-primary={!disabled}>
			{withCollectionLabel ? nft.collection.name : nft.name}
		</span>
		<span class="truncate text-xs" class:text-tertiary={!disabled}>
			#{nft.id}
			{#if withCollectionLabel}
				&ndash; {nft.name}
			{/if}
		</span>
	</span>
</button>
