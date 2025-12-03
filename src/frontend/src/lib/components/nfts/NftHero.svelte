<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import NftActionButtons from '$lib/components/nfts/NftActionButtons.svelte';
	import NftBadge from '$lib/components/nfts/NftBadge.svelte';
	import NftDisplayGuard from '$lib/components/nfts/NftDisplayGuard.svelte';
	import NftMetadataList from '$lib/components/nfts/NftMetadataList.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import ExpandText from '$lib/components/ui/ExpandText.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { PLAUSIBLE_EVENT_SOURCES } from '$lib/enums/plausible';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store.js';
	import { userSelectedNetworkStore } from '$lib/stores/settings.store';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import { nftsUrl } from '$lib/utils/nav.utils';
	import { getNftDisplayId } from '$lib/utils/nft.utils';
	import { parseNetworkId } from '$lib/validation/network.validation.js';

	interface Props {
		token?: NonFungibleToken;
		nft?: Nft;
	}

	const { token, nft }: Props = $props();

	const breadcrumbItems = $derived.by(() => {
		let breadcrumbs = [
			{
				label: $i18n.navigation.text.tokens,
				url: nftsUrl({
					originSelectedNetwork: nonNullish($userSelectedNetworkStore)
						? parseNetworkId($userSelectedNetworkStore)
						: undefined
				})
			}
		];
		if (nonNullish(nft) && nonNullish(nft.collection.name)) {
			breadcrumbs = [
				...breadcrumbs,
				{
					label: nft.collection.name,
					url: nftsUrl({ collection: nft?.collection })
				}
			];
		}
		return breadcrumbs;
	});

	const normalizedNftName = $derived.by(() => {
		if (isNullish(nft)) {
			return;
		}

		const {
			name,
			collection: { name: collectionName }
		} = nft;

		const idToUse = getNftDisplayId(nft);

		if (nonNullish(name)) {
			// sometimes NFT names include the number itself, in that case we do not display the number
			return name.includes(`#${idToUse}`) ? name : `${name} #${idToUse}`;
		}

		if (nonNullish(collectionName)) {
			return `${collectionName} #${idToUse}`;
		}

		return `#${idToUse}`;
	});
</script>

<div class="relative overflow-hidden rounded-xl" in:fade>
	<div class="relative h-64 w-full overflow-hidden">
		<div class="absolute h-full w-full">
			<NftDisplayGuard
				location={{
					source: PLAUSIBLE_EVENT_SOURCES.NFT_PAGE,
					subSource: 'hero'
				}}
				{nft}
				showMessage={false}
				type="hero-banner"
			>
				<BgImg imageUrl={nft?.imageUrl} size="cover" styleClass=" blur" />
			</NftDisplayGuard>
		</div>

		{#if nonNullish(nft?.imageUrl)}
			<div class="absolute flex h-full w-full items-center justify-center text-center">
				<div class="relative flex h-[90%] overflow-hidden rounded-xl border-2 border-off-white">
					<NftDisplayGuard
						location={{
							source: PLAUSIBLE_EVENT_SOURCES.NFT_PAGE,
							subSource: 'hero'
						}}
						{nft}
						type="nft-display"
					>
						<button
							class="block h-auto w-auto border-0"
							onclick={() =>
								modalStore.openNftFullscreenDisplay({
									id: Symbol('nft-fullscreen-display'),
									data: nft
								})}
						>
							<Img src={nft.imageUrl} styleClass="max-h-full max-w-full" />
						</button>
					</NftDisplayGuard>
					<span class="absolute right-0 bottom-0 m-2.5">
						<NetworkLogo color="white" network={nft.collection.network} size="xs" />
					</span>
				</div>
			</div>
		{/if}
	</div>

	<div class="bg-primary p-4">
		<BreadcrumbNavigation items={breadcrumbItems} />

		{#if nonNullish(normalizedNftName)}
			<div class="my-3 flex w-full flex-col justify-between gap-3 md:flex-row">
				<div class="flex w-full min-w-0 flex-1 items-center gap-2">
					<NftBadge {token} />
					<h1 class="min-w-0 truncate">
						{normalizedNftName}
					</h1>
				</div>

				{#if nonNullish(nft)}
					<NftActionButtons />
				{/if}
			</div>
		{:else}
			<span class="block max-w-80">
				<SkeletonText />
			</span>
		{/if}

		{#if nonNullish(nft?.description)}
			<div class="mb-5 text-sm">
				<ExpandText maxWords={20} text={nft.description} />
			</div>
		{/if}

		<NftMetadataList {nft} source={PLAUSIBLE_EVENT_SOURCES.NFT_PAGE} />
	</div>
</div>
