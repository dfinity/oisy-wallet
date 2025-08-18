<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import NftHero from '$lib/components/nfts/NftHero.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { nftStore } from '$lib/stores/nft.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Nft } from '$lib/types/nft';

	const [collectionId, nftId] = $derived([$page.params.collectionId, $page.params.nftId]);

	const nft: Nft | undefined = $derived(
		($nftStore ?? []).find(
			(nft) => String(nft.id) === nftId && nft.collection.address === collectionId
		)
	);

	let timeout: NodeJS.Timeout | undefined = $state();

	onMount(() => {
		timeout = setTimeout(() => {
			if (isNullish(nft)) {
				goto(AppPath.Nfts);
				toastsError({ msg: { text: 'Could not load NFT' } });
			}
		}, 10000);

		return () => {
			if (nonNullish(timeout)) {
				clearTimeout(timeout);
			}
		};
	});
</script>

<NftHero {nft} />
