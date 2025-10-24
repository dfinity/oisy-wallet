<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { NFT_PAGES_CONTEXT_KEY, type NftPagesContext } from '$lib/stores/nft-pages.store';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { nonNullish } from '@dfinity/utils';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	const { store } = getContext<NftPagesContext>(NFT_PAGES_CONTEXT_KEY);

	$effect(() => {
		if (nonNullish($selectedNetwork?.id)) {
			store.setOriginSelectedNetwork($selectedNetwork.id);
		}
	});
</script>

{@render children()}
