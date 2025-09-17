<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import NftBadge from '$lib/components/nfts/NftBadge.svelte';
	import NftCollectionActionButtons from '$lib/components/nfts/NftCollectionActionButtons.svelte';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
	import NftMetadataList from '$lib/components/nfts/NftMetadataList.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';

	interface Props {
		token?: NonFungibleToken;
		nfts: Nft[];
	}

	const { token, nfts }: Props = $props();

	const breadcrumbItems = $derived([{ label: $i18n.navigation.text.tokens, url: AppPath.Nfts }]);

	const firstNft = $derived(nfts?.[0]);
	const bannerUrl = $derived(nonNullish(firstNft) ? firstNft.collection.bannerImageUrl : undefined);
</script>

<div class="relative overflow-hidden rounded-xl" in:slide>
	<div class="flex h-64 w-full">
		<NftImageConsent nft={nfts?.[0]} type="hero-banner">
			<BgImg imageUrl={bannerUrl ?? nfts?.[0]?.imageUrl} size="cover" />
		</NftImageConsent>
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

		<NftMetadataList {token} />
	</div>
</div>
