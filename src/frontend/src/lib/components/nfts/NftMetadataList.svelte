<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkWithLogo from '$lib/components/networks/NetworkWithLogo.svelte';
	import NftImageConsentPreference from '$lib/components/nfts/NftImageConsentPreference.svelte';
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NftCollection, NonFungibleToken } from '$lib/types/nft';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getContractExplorerUrl } from '$lib/utils/networks.utils';
	import { findNonFungibleToken, mapTokenToCollection } from '$lib/utils/nfts.utils';

	interface Props {
		nft?: Nft;
		token?: NonFungibleToken;
	}

	const { nft, token }: Props = $props();

	const collection: NftCollection | undefined = $derived(
		nft?.collection ?? (nonNullish(token) ? mapTokenToCollection(token) : undefined)
	);

	const tokenByNft = $derived(
		nonNullish(collection)
			? findNonFungibleToken({
					tokens: $nonFungibleTokens,
					address: collection.address,
					networkId: collection.network.id
				})
			: token
	);
</script>

<List condensed styleClass="text-sm text-primary">
	<ListItem>
		<span class="text-tertiary">{$i18n.nfts.text.collection_name}</span>
		{#if nonNullish(collection?.name)}
			<span class="flex items-center">
				{shortenWithMiddleEllipsis({ text: collection?.name })}
			</span>
		{:else}
			<span class="min-w-12">
				<SkeletonText />
			</span>
		{/if}
	</ListItem>
	{#if nonNullish(nft)}
		<ListItem>
			<span class="text-tertiary">{$i18n.nfts.text.token_id}</span>
			{nft.id}
		</ListItem>
	{/if}
	<ListItem>
		<span class="text-tertiary">{$i18n.nfts.text.collection_address}</span>
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
		<span class="text-tertiary">{$i18n.nfts.text.display_preference}</span>
		{#if nonNullish(collection)}
			<NftImageConsentPreference {collection} />
		{:else}
			<span class="min-w-12">
				<SkeletonText />
			</span>
		{/if}
	</ListItem>
	<ListItem>
		<span class="text-tertiary">{$i18n.networks.network}</span>
		{#if nonNullish(collection?.network)}
			<NetworkWithLogo network={collection.network} />
		{:else}
			<span class="min-w-12">
				<SkeletonText />
			</span>
		{/if}
	</ListItem>
	<ListItem>
		<span class="text-tertiary">{$i18n.nfts.text.token_standard}</span>
		{#if nonNullish(collection?.standard)}
			<span class="uppercase">{collection.standard}</span>
		{:else}
			<span class="min-w-12">
				<SkeletonText />
			</span>
		{/if}
	</ListItem>
	{#if nonNullish(tokenByNft) && isTokenErc1155(tokenByNft) && nonNullish(nft?.balance)}
		<ListItem
			><span class="text-tertiary">{$i18n.nfts.text.quantity}</span><span class="uppercase"
				>{nft.balance}</span
			></ListItem
		>
	{/if}
	{#if nonNullish(nft?.attributes) && nft.attributes.length > 0}
		<ListItem styleClass="text-tertiary">{$i18n.nfts.text.item_traits}</ListItem>
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
