<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { routeCollection } from '$lib/derived/nav.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import {
		initNftPagesStore,
		NFT_PAGES_CONTEXT_KEY,
		type NftPagesContext
	} from '$lib/stores/nft-pages.store';
	import { isNullish } from '@dfinity/utils';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	const { store } = setContext<NftPagesContext>(NFT_PAGES_CONTEXT_KEY, {
		store: initNftPagesStore()
	});

	$effect(() => {
		// Add conditions to exclude certain pages from updating the origin network
		// This way we have a way to know what network has been selected by the user
		if (isNullish($routeCollection)) {
			store.setOriginSelectedNetwork($selectedNetwork?.id);
		}
	});
</script>

{@render children()}
