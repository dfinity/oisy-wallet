<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftCollectionList from '$lib/components/nfts/NftCollectionList.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import {
		NFT_COLLECTION_LIST_COMMON,
		NFT_COLLECTION_LIST_HIDDEN,
		NFT_COLLECTION_LIST_SPAM
	} from '$lib/constants/test-ids.constants';
	import { nftGroupByCollection, showHidden, showSpam } from '$lib/derived/settings.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NftCollectionUi } from '$lib/types/nft';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';

	type CollectionBuckets = {
		common: NftCollectionUi[];
		hidden: NftCollectionUi[];
		spam: NftCollectionUi[];
	};

	let nfts: Nft[] = $state([]);
	let nftCollections: NftCollectionUi[] = $state([]);

	const {
		common: commonCollections,
		hidden: hiddenCollections,
		spam: spamCollections
	} = $derived.by(() => {
		return nftCollections.reduce<CollectionBuckets>((acc, collection) => {
			const token = findNonFungibleToken({
				tokens: $nonFungibleTokens,
				address: collection.collection.address,
				networkId: collection.collection.network.id
			});

			if (nonNullish(token)) {
				if (token.section === CustomTokenSection.SPAM) {
					return { ...acc, spam: [...acc.spam, collection] };
				} else if (token.section === CustomTokenSection.HIDDEN) {
					return { ...acc, hidden: [...acc.hidden, collection] };
				} else {
					return { ...acc, common: [...acc.common, collection] };
				}
			}

			return acc;
		}, {common: [], hidden: [], spam: []})
	});

	const isEmptyList = $derived.by(() => {
		const hasNoCollections = nftCollections.length === 0;
		const hasCommonCollections = commonCollections.length > 0;
		const hasVisibleSpamCollections = $showSpam && spamCollections.length > 0;
		const hasVisibleHiddenCollections = $showHidden && hiddenCollections.length > 0;
		return (
			hasNoCollections ||
			!(hasCommonCollections || hasVisibleSpamCollections || hasVisibleHiddenCollections)
		);
	});
</script>

<NftsDisplayHandler bind:nfts bind:nftCollections>
	{#if $nftGroupByCollection}
		{#if isEmptyList}
			<EmptyNftsList />
		{:else}
			<NftCollectionList
				nftCollections={commonCollections}
				testId={NFT_COLLECTION_LIST_COMMON}
				title={$i18n.nfts.text.collections}
			/>

			{#if $showHidden}
				<NftCollectionList
					nftCollections={hiddenCollections}
					testId={NFT_COLLECTION_LIST_HIDDEN}
					title={$i18n.nfts.text.hidden}
				>
					{#snippet icon()}
						<IconEyeOff size="24" />
					{/snippet}
				</NftCollectionList>
			{/if}

			{#if $showSpam}
				<NftCollectionList
					nftCollections={spamCollections}
					testId={NFT_COLLECTION_LIST_SPAM}
					title={$i18n.nfts.text.spam}
				>
					{#snippet icon()}
						<IconAlertOctagon size="24" />
					{/snippet}
				</NftCollectionList>
			{/if}
		{/if}
	{:else if nftCollections.length === 0}
		<EmptyNftsList />
	{:else}
		<h5 class="mt-5">{$i18n.nfts.text.all_assets}</h5>
		<div class="grid grid-cols-2 gap-3 gap-y-4 py-4 md:grid-cols-3">
			{#each nfts as nft, index (`${String(nft.id)}-${index}`)}
				<NftCard {nft} />
			{/each}
		</div>
	{/if}
</NftsDisplayHandler>
