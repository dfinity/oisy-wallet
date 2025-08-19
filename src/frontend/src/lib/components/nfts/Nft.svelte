<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import NftHero from '$lib/components/nfts/NftHero.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { nftStore } from '$lib/stores/nft.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Nft } from '$lib/types/nft';
	import { FALLBACK_TIMEOUT } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';

	const [networkId, collectionId, nftId] = $derived([
		page.params.networkId,
		page.params.collectionId,
		page.params.nftId
	]);

	const nft: Nft | undefined = $derived(
		($nftStore ?? []).find(
			(nft) =>
				String(nft.id) === nftId &&
				nft.collection.address === collectionId &&
				nft.collection.network.name === networkId
		)
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

<NftHero {nft} />
