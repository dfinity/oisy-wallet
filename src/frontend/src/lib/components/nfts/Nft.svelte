<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import NftCollectionCard from '$lib/components/nfts/NftCollectionDescription.svelte';
	import NftHero from '$lib/components/nfts/NftHero.svelte';
	import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
	import { pageNft } from '$lib/derived/page-nft.derived';
	import { pageNonFungibleToken } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NonFungibleToken } from '$lib/types/nft';
	import { nftsUrl } from '$lib/utils/nav.utils';
	import type { NetworkId } from '$lib/types/network';
	import { NFT_CONTEXT_KEY } from '$lib/constants/nft.constants';

	const nft = $derived($pageNft);

	const token: NonFungibleToken | undefined = $derived($pageNonFungibleToken);

	const originSelectedNetwork: NetworkId | undefined = getContext(NFT_CONTEXT_KEY);

	// Redirect to the assets' page if NFT can't be loaded within 10 seconds
	let timeout: NodeJS.Timeout | undefined = $state();

	onMount(() => {
		timeout = setTimeout(() => {
			if (isNullish(nft)) {
				console.log(originSelectedNetwork);
				goto(nftsUrl({ originSelectedNetwork }));
				toastsError({ msg: { text: $i18n.nfts.text.nft_not_loaded } });
			}
		}, FALLBACK_TIMEOUT);

		return () => {
			if (nonNullish(timeout)) {
				clearTimeout(timeout);
			}
		};
	});

	console.log(originSelectedNetwork);
</script>

<NftHero {nft} {token} />

<NftCollectionCard collection={nft?.collection} />
