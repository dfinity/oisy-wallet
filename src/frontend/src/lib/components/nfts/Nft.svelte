<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import NftDescription from '$lib/components/nfts/NftDescription.svelte';
	import NftHero from '$lib/components/nfts/NftHero.svelte';
	import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { nftStore } from '$lib/stores/nft.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import { parseNftId } from '$lib/validation/nft.validation';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';

	const [networkId, collectionId, nftId] = $derived([
		page.params.networkId,
		page.params.collectionId,
		page.params.nftId
	]);

	const nft: Nft | undefined = $derived(
		($nftStore ?? []).find(
			(nft) =>
				nft.id === parseNftId(Number(nftId)) &&
				nft.collection.address === collectionId &&
				nft.collection.network.name === networkId
		)
	);

	const token: NonFungibleToken | undefined = $derived(
		findNonFungibleToken({
			tokens: $nonFungibleTokens,
			address: nft?.collection.address,
			networkId: nft?.collection.network.id
		})
	);

	// redirect to assets page if nft cant be loaded within 10s
	let timeout: NodeJS.Timeout | undefined = $state();

	onMount(() => {
		timeout = setTimeout(() => {
			if (isNullish(nft)) {
				goto(`${AppPath.Nfts}${page.url.search}`);
				toastsError({ msg: { text: $i18n.nfts.text.nft_not_loaded } });
			}
		}, FALLBACK_TIMEOUT);

		return () => {
			if (nonNullish(timeout)) {
				clearTimeout(timeout);
			}
		};
	});
</script>

<NftHero {token} {nft} />

<NftDescription {nft} />
