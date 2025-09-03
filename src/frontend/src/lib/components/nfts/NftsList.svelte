<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import EmptyNftsList from '$lib/components/nfts/EmptyNftsList.svelte';
	import NftCollectionList from '$lib/components/nfts/NftCollectionList.svelte';
	import NftList from '$lib/components/nfts/NftList.svelte';
	import NftsDisplayHandler from '$lib/components/nfts/NftsDisplayHandler.svelte';
	import { showHidden, showSpam } from '$lib/derived/settings.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftListStore } from '$lib/stores/nft-list.store';
	import type { Nft, NftCollectionUi } from '$lib/types/nft';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';

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
	{#if $nftListStore.groupByCollection}
		{#if isEmptyList}
			<EmptyNftsList />
		{:else}
			<NftCollectionList nftCollections={commonCollections} title={$i18n.nfts.text.collections} />

			{#if $showHidden}
				<NftCollectionList nftCollections={hiddenCollections} title={$i18n.nfts.text.hidden}>
					{#snippet icon()}
						<IconEyeOff size="24" />
					{/snippet}
				</NftCollectionList>
			{/if}

			{#if $showSpam}
				<NftCollectionList nftCollections={spamCollections} title={$i18n.nfts.text.spam}>
					{#snippet icon()}
						<IconAlertOctagon size="24" />
					{/snippet}
				</NftCollectionList>
			{/if}
		{/if}
	{:else if isEmptyList}
		<EmptyNftsList />
	{:else}
		<NftList nfts={commonNfts} title={$i18n.nfts.text.all_assets} />

		{#if $showHidden}
			<NftList hidden nfts={hiddenNfts} title={$i18n.nfts.text.hidden}>
				{#snippet icon()}
					<IconEyeOff size="24" />
				{/snippet}
			</NftList>
		{/if}

		{#if $showSpam}
			<NftList nfts={spamNfts} spam title={$i18n.nfts.text.spam}>
				{#snippet icon()}
					<IconAlertOctagon size="24" />
				{/snippet}
			</NftList>
		{/if}
	{/if}
</NftsDisplayHandler>
