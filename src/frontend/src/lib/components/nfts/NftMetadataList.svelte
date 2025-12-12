<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { isCollectionErc1155 } from '$eth/utils/erc1155.utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import NftImageConsentPreference from '$lib/components/nfts/NftImageConsentPreference.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import type { PLAUSIBLE_EVENT_SOURCES } from '$lib/enums/plausible';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NftCollection, NonFungibleToken } from '$lib/types/nft';
	import { formatSecondsToDate, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';
	import { mapTokenToCollection } from '$lib/utils/nfts.utils';

	interface Props {
		nft?: Nft;
		token?: NonFungibleToken;
		source: PLAUSIBLE_EVENT_SOURCES.NFT_PAGE | PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION;
	}

	const { nft, token, source }: Props = $props();

	const collection: NftCollection | undefined = $derived(
		nft?.collection ?? (nonNullish(token) ? mapTokenToCollection(token) : undefined)
	);

	const allowMedia = $derived(collection?.allowExternalContentSource);
</script>

<List
	condensed
	itemStyleClass="flex-col sm:flex-row sm:gap-12 sm:items-center"
	styleClass="text-sm text-primary"
>
	<ListItem>
		<span class="flex whitespace-nowrap text-tertiary">{$i18n.networks.network}</span>
		{#if nonNullish(collection?.network)}
			<NetworkWithLogo network={collection.network} />
		{:else}
			<span class="min-w-12">
				<SkeletonText />
			</span>
		{/if}
	</ListItem>
	<ListItem>
		<span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.collection_name}</span>
		{#if nonNullish(collection?.name)}
			<span class="inline-flex min-w-0 items-center">
				<span class="truncate">
					{collection?.name}
				</span>
				<AddressActions
					copyAddress={collection?.name}
					copyAddressText={$i18n.nfts.text.collection_name_copied ?? ''}
				/>
			</span>
		{:else}
			<span class="min-w-12">
				<SkeletonText />
			</span>
		{/if}
	</ListItem>
	{#if nonNullish(nft)}
		<ListItem>
			<span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.token_id}</span>
			<span class="inline-flex min-w-0 items-center">
				<span class="truncate">
					{nft?.id}
				</span>
				<AddressActions copyAddress={nft?.id} copyAddressText={$i18n.nfts.text.id_copied ?? ''} />
			</span>
		</ListItem>
	{/if}
	<ListItem>
		<span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.collection_address}</span>
		{#if nonNullish(collection?.address) && nonNullish(collection?.network)}
			<span class="flex items-center">
				<output>{shortenWithMiddleEllipsis({ text: collection?.address })}</output>
				<AddressActions
					copyAddress={collection?.address}
					copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
						$address: collection?.address
					})}
					externalLink={getContractExplorerUrl({
						network: collection?.network,
						contractAddress: collection?.address
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
		<span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.display_preference}</span>
		{#if nonNullish(collection)}
			<NftImageConsentPreference {collection} {source} />
		{:else}
			<span class="min-w-12">
				<SkeletonText />
			</span>
		{/if}
	</ListItem>
	<ListItem>
		<span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.token_standard}</span>
		{#if nonNullish(collection?.standard)}
			<span class="uppercase">{collection.standard}</span>
		{:else}
			<span class="min-w-12">
				<SkeletonText />
			</span>
		{/if}
	</ListItem>
	{#if nonNullish(nft)}
		<ListItem>
			<span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.received_at}</span>
			{#if nonNullish(nft?.acquiredAt) && nft?.acquiredAt.getTime() > 0}
				<output
					>{formatSecondsToDate({
						seconds: nft.acquiredAt.getTime() / 1000,
						language: $currentLanguage
					})}</output
				>
			{:else}
				<output>&ndash;</output>
			{/if}
		</ListItem>
		<ListItem>
			<span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.media_url}</span>
			{#if nonNullish(nft?.imageUrl)}
				<span class="inline-flex min-w-0 items-center">
					<output class="truncate text-tertiary"
						>{shortenWithMiddleEllipsis({ text: nft.imageUrl, splitLength: 20 })}</output
					>
					<AddressActions
						copyAddress={nft.imageUrl}
						copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
							$address: nft.imageUrl
						})}
						{...allowMedia && {
							externalLink: nft.imageUrl,
							externalLinkAriaLabel: $i18n.nfts.text.open_in_new_tab
						}}
					/>
				</span>
			{:else}
				<span class="min-w-12">
					<SkeletonText />
				</span>
			{/if}
		</ListItem>
	{/if}
	{#if nonNullish(collection) && isCollectionErc1155(collection) && nonNullish(nft?.balance)}
		<ListItem
			><span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.quantity}</span><span
				class="uppercase">{nft.balance}</span
			></ListItem
		>
	{/if}
	{#if nonNullish(nft?.attributes) && nft.attributes.length > 0}
		<ListItem styleClass="text-tertiary">{$i18n.nfts.text.item_traits}</ListItem>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each nft.attributes.sort((a, b) => a.traitType.localeCompare(b.traitType)
			) as trait, index (trait.traitType + index)}
				<div class="flex">
					<Badge variant="nft-trait"
						><span class="font-normal text-tertiary">{trait.traitType}</span><br /><span
							class="font-bold text-primary">{trait.value ?? ''}</span
						></Badge
					>
				</div>
			{/each}
		</div>
	{/if}
</List>
