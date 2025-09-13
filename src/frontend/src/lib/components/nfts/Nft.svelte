<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import NftDescription from '$lib/components/nfts/NftDescription.svelte';
	import NftHero from '$lib/components/nfts/NftHero.svelte';
	import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { pageNft } from '$lib/derived/page-nft.derived';
	import { nonFungibleTokens } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NonFungibleToken } from '$lib/types/nft';
	import { findNonFungibleToken } from '$lib/utils/nfts.utils';

	const nft = $derived($pageNft);

	const token: NonFungibleToken | undefined = $derived(
		nonNullish(nft) && nonNullish(nft.collection)
			? findNonFungibleToken({
					tokens: $nonFungibleTokens,
					address: nft.collection.address,
					networkId: nft.collection.network.id
				})
			: undefined
	);

	// Redirect to the assets' page if NFT can't be loaded within 10 seconds
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

<NftHero {nft} {token} />

<NftDescription {nft} />
