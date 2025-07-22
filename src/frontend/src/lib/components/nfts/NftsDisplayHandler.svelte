<script lang="ts">
	import type { Snippet } from 'svelte';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft } from '$lib/types/nft';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';

	interface Props {
		children: Snippet;
		nfts: Nft[];
	}

	let { children, nfts = $bindable([]) }: Props = $props();

	$effect(() => {
		const allNfts = $nftStore ?? [];
		nfts = allNfts.filter(({ contract: {address: nftContractAddress, network: {id: nftContractNetworkId}} }) =>
			$enabledNonFungibleTokens.some(({ address: contractAddress, network: {id: contractNetworkId} }) =>
				contractAddress === nftContractAddress && contractNetworkId === nftContractNetworkId)
		)
	});
</script>

{@render children()}
