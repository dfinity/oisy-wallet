<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import { isCollectionErc1155 } from '$eth/utils/erc1155.utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import NftImageConsentPreference from '$lib/components/nfts/NftImageConsentPreference.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import type { PLAUSIBLE_EVENT_SOURCES } from '$lib/enums/plausible';
	import { extractMediaUrls } from '$lib/services/url.services';
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

	const sortedAttributes = $derived(
		nonNullish(nft?.attributes)
			? // eslint-disable-next-line local-rules/prefer-object-params -- This is a sorting function, so the parameters will be provided not as an object but as separate arguments.
				nft.attributes.toSorted((a, b) => a.traitType.localeCompare(b.traitType))
			: []
	);

	let additionalMediaUrl = $state<string | undefined>();

	const updateAdditionalMediaUrl = async () => {
		if (isNullish(nft?.imageUrl) || !allowMedia) {
			additionalMediaUrl = undefined

			return;
		}

		[additionalMediaUrl] = await extractMediaUrls(nft.imageUrl);
	};

	$effect(() => {
		[nft, allowMedia];

		untrack(() => updateAdditionalMediaUrl());
	});
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
			<span>
				<span class="uppercase">{collection.standard.code}</span>
				{#if nonNullish(collection.standard.version)}
					{collection.standard.version}
				{/if}
			</span>
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

		{#if nonNullish(additionalMediaUrl)}
			<div class="mt-2" in:slide={SLIDE_PARAMS}>
				<MessageBox level="info">
					<div class="flex flex-col gap-1 text-sm">
						{$i18n.nfts.text.media_stored_at_different_location}

						<output class="truncate text-tertiary">
							{additionalMediaUrl}
						</output>

						<div class="items-end">
							<AddressActions
								copyAddress={additionalMediaUrl}
								copyAddressText={replacePlaceholders($i18n.nfts.text.address_copied, {
									$address: additionalMediaUrl
								})}
								{...allowMedia && {
									externalLink: additionalMediaUrl,
									externalLinkAriaLabel: $i18n.nfts.text.open_in_new_tab
								}}
							/>
						</div>
					</div>
				</MessageBox>
			</div>
		{/if}
	{/if}

	{#if nonNullish(collection) && isCollectionErc1155(collection) && nonNullish(nft?.balance)}
		<ListItem>
			<span class="flex whitespace-nowrap text-tertiary">{$i18n.nfts.text.quantity}</span><span
				class="uppercase">{nft.balance}</span
			>
		</ListItem>
	{/if}

	{#if sortedAttributes.length > 0}
		<ListItem styleClass="text-tertiary">{$i18n.nfts.text.item_traits}</ListItem>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each sortedAttributes as trait, index (trait.traitType + index)}
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
