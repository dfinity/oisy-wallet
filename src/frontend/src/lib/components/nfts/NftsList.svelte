<script lang="ts">
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftListStore } from '$lib/stores/nft-list.store';
	import type { Nft, NftCollectionUi } from '$lib/types/nft';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { nonNullish } from '@dfinity/utils';
	import { showHidden, showSpam } from '$lib/derived/settings.derived';
	import NftCollectionList from '$lib/components/nfts/NftCollectionList.svelte';
	import {
		NFT_COLLECTION_LIST_COMMON,
		NFT_COLLECTION_LIST_HIDDEN,
		NFT_COLLECTION_LIST_SPAM
	} from '$lib/constants/test-ids.constants';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';

	let nfts: Nft[] = $state([]);
	let nftCollections: NftCollectionUi[] = $state([]);

	const {
		common: commonCollections,
		spam: spamCollections,
		hidden: hiddenCollections
	} = $derived.by(() => {
		const common: NftCollectionUi[] = [];
		const spam: NftCollectionUi[] = [];
		const hidden: NftCollectionUi[] = [];
		nftCollections.forEach((collection) => {
			const token = findNonFungibleToken({
				tokens: $nonFungibleTokens,
				address: collection.collection.address,
				networkId: collection.collection.network.id
			});
			if (nonNullish(token)) {
				if (token.section === CustomTokenSection.SPAM) {
					spam.push(collection);
				} else if (token.section === CustomTokenSection.HIDDEN) {
					hidden.push(collection);
				} else {
					common.push(collection);
				}
			}
		});
		return { common, spam, hidden };
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
	{#if $nftListStore.groupByCollection}
		{#if isEmptyList}
			<EmptyNftsList />
		{:else}
			<NftCollectionList nftCollections={commonCollections} title={$i18n.nfts.text.collections} testId={NFT_COLLECTION_LIST_COMMON} />

			{#if $showHidden}
				<NftCollectionList nftCollections={hiddenCollections} title={$i18n.nfts.text.hidden} testId={NFT_COLLECTION_LIST_HIDDEN}>
					{#snippet icon()}
						<IconEyeOff size="24" />
					{/snippet}
				</NftCollectionList>
			{/if}

			{#if $showSpam}
				<NftCollectionList nftCollections={spamCollections} title={$i18n.nfts.text.spam} testId={NFT_COLLECTION_LIST_SPAM}>
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
