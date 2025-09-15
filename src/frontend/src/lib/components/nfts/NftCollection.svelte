<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import NftCard from '$lib/components/nfts/NftCard.svelte';
	import NftCardSkeleton from '$lib/components/nfts/NftCardSkeleton.svelte';
	import NftCollectionHero from '$lib/components/nfts/NftCollectionHero.svelte';
	import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { pageCollectionNfts } from '$lib/derived/page-nft.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { CustomTokenSection } from '$lib/enums/custom-token-section';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Nft, NftCollection, NonFungibleToken } from '$lib/types/nft';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';

	const collectionNfts: Nft[] = $derived($pageCollectionNfts);

	const collection: NftCollection | undefined = $derived(collectionNfts?.[0]?.collection);

	const token: NonFungibleToken | undefined = $derived(
		findNonFungibleToken({
			tokens: $nonFungibleTokens,
			address: collection?.address,
			networkId: collection?.network.id
		})
	);

	// Redirect to the assets' page if the collection can't be loaded within 10 seconds
	let timeout: NodeJS.Timeout | undefined = $state();

	onMount(() => {
		timeout = setTimeout(() => {
			if (isNullish(collection)) {
				goto(`${AppPath.Nfts}${page.url.search}`);
				toastsError({ msg: { text: $i18n.nfts.text.collection_not_loaded } });
			}
		}, FALLBACK_TIMEOUT);

		return () => {
			if (nonNullish(timeout)) {
				clearTimeout(timeout);
			}
		};
	});
</script>

<NftCollectionHero nfts={collectionNfts} {token} />

<div class="mt-4 grid grid-cols-2 gap-3 gap-y-4 py-4 md:grid-cols-3">
	{#if collectionNfts.length > 0}
		{#each collectionNfts as nft, index (`${nft.id}-${index}`)}
			<NftCard
				isHidden={nonNullish(token) && token.section === CustomTokenSection.HIDDEN}
				isSpam={nonNullish(token) && token.section === CustomTokenSection.SPAM}
				{nft}
			/>
		{/each}
	{:else}
		<NftCardSkeleton times={3} />
	{/if}
</div>
