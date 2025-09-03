<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCollectionList from '$lib/components/nfts/NftCollectionList.svelte';
	import NftList from '$lib/components/nfts/NftList.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import {
		NFT_COLLECTION_LIST_COMMON,
		NFT_COLLECTION_LIST_HIDDEN,
		NFT_COLLECTION_LIST_SPAM,
		NFT_LIST_COMMON,
		NFT_LIST_HIDDEN,
		NFT_LIST_SPAM
	} from '$lib/constants/test-ids.constants';
	import { showHidden, showSpam, nftGroupByCollection } from '$lib/derived/settings.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Nft, NftCollectionUi } from '$lib/types/nft';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';

	let nfts: Nft[] = $state([]);
	let nftCollections: NftCollectionUi[] = $state([]);

	const {
		common: commonCollections,
		spam: spamCollections,
		hidden: hiddenCollections
	} = $derived.by(() => {
		let common: NftCollectionUi[] = [];
		let spam: NftCollectionUi[] = [];
		let hidden: NftCollectionUi[] = [];

		nftCollections.forEach((collection) => {
			const token = findNonFungibleToken({
				tokens: $nonFungibleTokens,
				address: collection.collection.address,
				networkId: collection.collection.network.id
			});

			if (nonNullish(token)) {
				if (token.section === CustomTokenSection.SPAM) {
					spam = [...spam, collection];
				} else if (token.section === CustomTokenSection.HIDDEN) {
					hidden = [...hidden, collection];
				} else {
					common = [...common, collection];
				}
			}
		});

		return { common, spam, hidden };
	});

	const {
		common: commonNfts,
		spam: spamNfts,
		hidden: hiddenNfts
	} = $derived.by(() => {
		const common: Nft[] = [];
		const spam: Nft[] = [];
		const hidden: Nft[] = [];

		nfts.forEach((nft) => {
			const token = findNonFungibleToken({
				tokens: $nonFungibleTokens,
				address: nft.collection.address,
				networkId: nft.collection.network.id
			});

			if (nonNullish(token)) {
				if (token.section === CustomTokenSection.SPAM) {
					spam.push(nft);
				} else if (token.section === CustomTokenSection.HIDDEN) {
					hidden.push(nft);
				} else {
					common.push(nft);
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
	{:else if isEmptyList}
		<EmptyNftsList />
	{:else}
		<NftList nfts={commonNfts} testId={NFT_LIST_COMMON} title={$i18n.nfts.text.all_assets} />

		{#if $showHidden}
			<NftList hidden nfts={hiddenNfts} testId={NFT_LIST_HIDDEN} title={$i18n.nfts.text.hidden}>
				{#snippet icon()}
					<IconEyeOff size="24" />
				{/snippet}
			</NftList>
		{/if}

		{#if $showSpam}
			<NftList nfts={spamNfts} spam testId={NFT_LIST_SPAM} title={$i18n.nfts.text.spam}>
				{#snippet icon()}
					<IconAlertOctagon size="24" />
				{/snippet}
			</NftList>
		{/if}
	{/if}
</NftsDisplayHandler>
