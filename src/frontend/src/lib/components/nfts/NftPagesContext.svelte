<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { NFT_PAGES_CONTEXT_KEY, type NftPagesContext } from '$lib/stores/nft-pages.store';
	import { selectedNetwork } from '$lib/derived/network.derived';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	const { store } = getContext<NftPagesContext>(NFT_PAGES_CONTEXT_KEY);

	$effect(() => {
		store.setOriginSelectedNetwork($selectedNetwork?.id);
	});
</script>

{@render children()}
