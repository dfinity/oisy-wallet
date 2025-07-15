<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Nft } from '$lib/types/nft';
	import { nftStore } from '$lib/stores/nft.store';

	interface Props {
		children: Snippet;
		nfts: Nft[];
	}

	let { children, nfts = $bindable([]) }: Props = $props();

	$effect(() => {
		nfts = $nftStore
	})
</script>

{@render children()}
