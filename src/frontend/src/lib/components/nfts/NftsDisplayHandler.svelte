<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enabledNonFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NftCollection, Nft } from '$lib/types/nft';

	interface Props {
		children: Snippet;
		nfts: Nft[];
		nftCollections: NftCollection[];
	}

	let { children, nfts = $bindable([]), nftCollections = $bindable([]) }: Props = $props();

	$effect(() => {
		let nfts = ($nftStore ?? []).filter(
			({
				collection: {
					address: nftContractAddress,
					network: { id: nftContractNetworkId }
				}
			}) =>
				$enabledNonFungibleNetworkTokens.some(
					({ address: contractAddress, network: { id: contractNetworkId } }) =>
						contractAddress === nftContractAddress && contractNetworkId === nftContractNetworkId
				)
		);

		nftCollections = Array.from(
			new Map(nfts.map((item) => [item.collection.address, item.collection])).values()
		);
	});
</script>

{@render children()}
