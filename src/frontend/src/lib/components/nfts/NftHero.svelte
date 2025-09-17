<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import NftActionButtons from '$lib/components/nfts/NftActionButtons.svelte';
	import NftBadge from '$lib/components/nfts/NftBadge.svelte';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store.js';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import NftMetadataList from '$lib/components/nfts/NftMetadataList.svelte';

	interface Props {
		token?: NonFungibleToken;
		nft?: Nft;
	}

	const { token, nft }: Props = $props();

	const breadcrumbItems = $derived.by(() => {
		let breadcrumbs = [{ label: $i18n.navigation.text.tokens, url: AppPath.Nfts as string }];
		if (nonNullish(nft) && nonNullish(nft.collection.name)) {
			breadcrumbs = [
				...breadcrumbs,
				{
					label: nft.collection.name,
					url: `${AppPath.Nfts}${nft.collection.network.name}-${nft.collection.address}`
				}
			];
		}
		return breadcrumbs;
	});

	const normalizedNftName = $derived.by(() => {
		if (nonNullish(nft?.name)) {
			// sometimes NFT names include the number itself, in that case we do not display the number
			return nft.name.includes(`#${nft.id}`) ? nft.name : `${nft.name} #${nft.id}`;
		}
	});
</script>

<div class="relative overflow-hidden rounded-xl" in:fade>
	<div class="relative h-64 w-full overflow-hidden">
		<div class="absolute h-full w-full">
			<NftImageConsent {nft} showMessage={false} type="hero-banner">
				<BgImg imageUrl={nft?.imageUrl} size="cover" styleClass=" blur" />
			</NftImageConsent>
		</div>

		{#if nonNullish(nft?.imageUrl)}
			<div class="absolute flex h-full w-full items-center justify-center text-center">
				<div class="relative flex h-[90%] overflow-hidden rounded-xl border-2 border-off-white">
					<NftImageConsent {nft} type="nft-display">
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
					</NftImageConsent>
					<span class="absolute bottom-0 right-0 m-2.5">
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

		<NftMetadataList {nft} />
	</div>
</div>
