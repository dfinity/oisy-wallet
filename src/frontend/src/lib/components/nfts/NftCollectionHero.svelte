<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import NftBadge from '$lib/components/nfts/NftBadge.svelte';
	import NftCollectionActionButtons from '$lib/components/nfts/NftCollectionActionButtons.svelte';
	import NftDisplayGuard from '$lib/components/nfts/NftDisplayGuard.svelte';
	import NftMetadataList from '$lib/components/nfts/NftMetadataList.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import ExpandText from '$lib/components/ui/ExpandText.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { PLAUSIBLE_EVENT_SOURCES } from '$lib/enums/plausible';
	import { i18n } from '$lib/stores/i18n.store';
	import { userSelectedNetworkStore } from '$lib/stores/settings.store';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import { nftsUrl } from '$lib/utils/nav.utils';
	import { parseNetworkId } from '$lib/validation/network.validation';

	interface Props {
		token?: NonFungibleToken;
		nfts: Nft[];
	}

	const { token, nfts }: Props = $props();

	const breadcrumbItems = $derived([
		{
			label: $i18n.navigation.text.tokens,
			url: nftsUrl({
				originSelectedNetwork: nonNullish($userSelectedNetworkStore)
					? parseNetworkId($userSelectedNetworkStore)
					: undefined
			})
		}
	]);

	const firstNft = $derived(nfts?.[0]);
	const bannerUrl = $derived(nonNullish(firstNft) ? firstNft.collection.bannerImageUrl : undefined);
</script>

<div class="relative overflow-hidden rounded-xl">
	<div class="flex h-64 w-full">
		<NftDisplayGuard
			location={{
				source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION,
				subSource: 'hero'
			}}
			nft={nfts?.[0]}
			type="hero-banner"
		>
			<BgImg imageUrl={bannerUrl ?? nfts?.[0]?.imageUrl} size="cover" />
		</NftDisplayGuard>
	</div>

	<div class="bg-primary p-4">
		<BreadcrumbNavigation items={breadcrumbItems} />

		{#if nonNullish(token)}
			<div class="my-3 flex w-full flex-col justify-between gap-3 md:flex-row">
				<div class="flex w-full min-w-0 flex-1 items-center gap-2">
					<NftBadge {token} />
					<h1 class="min-w-0 truncate">
						{token.name}
					</h1>
				</div>

				<NftCollectionActionButtons {token} />
			</div>
		{:else}
			<span class="block max-w-40">
				<SkeletonText />
			</span>
		{/if}

		{#if nonNullish(token?.description)}
			<div class="mb-5 text-sm">
				<ExpandText maxWords={20} text={token.description} />
			</div>
		{/if}

		<NftMetadataList source={PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION} {token} />
	</div>
</div>
