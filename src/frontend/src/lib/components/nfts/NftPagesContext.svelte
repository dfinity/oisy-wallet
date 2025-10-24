<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { routeCollection } from '$lib/derived/nav.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import {
		initNftPagesStore,
		NFT_PAGES_CONTEXT_KEY,
		type NftPagesContext
	} from '$lib/stores/nft-pages.store';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	const { store } = setContext<NftPagesContext>(NFT_PAGES_CONTEXT_KEY, {
		store: initNftPagesStore()
	});

	$effect(() => {
		if (!$routeCollection) {
			store.setOriginSelectedNetwork($selectedNetwork?.id);
		}
	});
</script>

{@render children()}
