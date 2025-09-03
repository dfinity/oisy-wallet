<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import NftBadgeHidden from '$lib/components/nfts/NftBadgeHidden.svelte';
	import NftBadgeSpam from '$lib/components/nfts/NftBadgeSpam.svelte';
	import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
	import NftImageConsentPreference from '$lib/components/nfts/NftImageConsentPreference.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BgImg from '$lib/components/ui/BgImg.svelte';
	import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';
	import { getAllowMediaForNft } from '$lib/utils/nfts.utils';

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
						<Img src={nft?.imageUrl} />
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
			<div class="my-3 w-full justify-between">
				<div class="flex items-center gap-3">
					<h1 class="truncate">
						{normalizedNftName}
					</h1>

					{#if nonNullish(token) && token.section === CustomTokenSection.HIDDEN}
						<NftBadgeHidden />
					{/if}

					{#if nonNullish(token) && token.section === CustomTokenSection.SPAM}
						<NftBadgeSpam />
					{/if}
				</div>
			</div>
		{:else}
			<span class="block max-w-80">
				<SkeletonText />
			</span>
		{/if}

		<List condensed styleClass="text-sm text-tertiary">
			<ListItem>
				<span>{$i18n.nfts.text.collection_address}</span>
				{#if nonNullish(nft)}
					<span class="flex items-center">
						<output>{shortenWithMiddleEllipsis({ text: nft.collection.address })}</output>
						<AddressActions
							copyAddress={nft.collection.address}
							copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
								$address: nft.collection.address
							})}
							externalLink={getContractExplorerUrl({
								network: nft.collection.network,
								contractAddress: nft.collection.address
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
				<span>{$i18n.nfts.text.display_preference}</span>
				{#if nonNullish(nft)}
					<NftImageConsentPreference {nft} />
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>{$i18n.networks.network}</span>
				{#if nonNullish(nft)}
					<NetworkWithLogo network={nft.collection.network} />
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			<ListItem>
				<span>{$i18n.nfts.text.token_standard}</span>
				{#if nonNullish(nft)}
					<span class="uppercase">{nft.collection.standard}</span>
				{:else}
					<span class="min-w-12">
						<SkeletonText />
					</span>
				{/if}
			</ListItem>
			{#if nft?.collection.standard === 'erc1155'}
				<ListItem
					><span>{$i18n.nfts.text.quantity}</span><span class="uppercase">{nft.balance}</span
					></ListItem
				>
			{/if}
			{#if nonNullish(nft?.attributes) && nft.attributes.length > 0}
				<ListItem>{$i18n.nfts.text.item_traits}</ListItem>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each nft.attributes as trait, index (trait.value + index)}
						<div class="flex">
							<Badge variant="nft-trait"
								><span class="font-normal text-tertiary">{trait.traitType}</span><br /><span
									class="font-bold text-primary">{trait.value}</span
								></Badge
							>
						</div>
					{/each}
				</div>
			{/if}
		</List>
	</div>
</div>
