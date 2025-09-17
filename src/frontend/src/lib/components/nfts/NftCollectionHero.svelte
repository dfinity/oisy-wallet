<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import NftBadge from '$lib/components/nfts/NftBadge.svelte';
	import NftCollectionActionButtons from '$lib/components/nfts/NftCollectionActionButtons.svelte';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
	import NftImageConsentPreference from '$lib/components/nfts/NftImageConsentPreference.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';

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

		<List condensed styleClass="text-sm text-primary">
			<ListItem
				><span class="text-tertiary">{$i18n.nfts.text.collection_address}</span>

				{#if nonNullish(token)}
					<span class="flex items-center">
						<output>{shortenWithMiddleEllipsis({ text: token.address })}</output>
						<AddressActions
							copyAddress={token.address}
							copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
								$address: token.address
							})}
							externalLink={getContractExplorerUrl({
								network: token.network,
								contractAddress: token.address
							})}
							externalLinkAriaLabel={$i18n.nfts.text.open_explorer}
						/>
					</span>
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span class="text-tertiary">{$i18n.networks.network}</span>
				{#if nonNullish(token)}
					<NetworkWithLogo network={token.network} />
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span class="text-tertiary">{$i18n.nfts.text.token_standard}</span>
				{#if nonNullish(token)}
					<span class="uppercase">{token.standard}</span>
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span class="text-tertiary">{$i18n.nfts.text.display_preference}</span>
				{#if nonNullish(nfts?.[0])}
					<NftImageConsentPreference nft={nfts[0]} />
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
		</List>
	</div>
</div>
