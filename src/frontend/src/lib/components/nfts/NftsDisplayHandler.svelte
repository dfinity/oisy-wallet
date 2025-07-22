<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enabledNonFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft } from '$lib/types/nft';

	interface Props {
		children: Snippet;
		nfts: Nft[];
	}

	let { children, nfts = $bindable([]) }: Props = $props();

	$effect(() => {
		nfts = ($nftStore ?? []).filter(
			({
				contract: {
					address: nftContractAddress,
					network: { id: nftContractNetworkId }
				}
			}) =>
				$enabledNonFungibleNetworkTokens.some(
					({ address: contractAddress, network: { id: contractNetworkId } }) =>
						contractAddress === nftContractAddress && contractNetworkId === nftContractNetworkId
				)
		);
	});
</script>

{@render children()}
