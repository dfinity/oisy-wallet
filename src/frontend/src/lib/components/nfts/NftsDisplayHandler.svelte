<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enabledNonFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NftCollection, Nft, NftCollectionUi } from '$lib/types/nft';

	interface Props {
		children: Snippet;
		nfts: Nft[];
		nftCollections: NftCollectionUi[];
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

		nftCollections = nfts.reduce<NftCollectionUi[]>((acc, item) => {
			const i = acc.findIndex((g) => g.collection.address === item.collection.address);

			if (i === -1) {
				return [...acc, { collection: item.collection, nfts: [item] }];
			}

			return acc.map((g, idx) => (idx === i ? { ...g, nfts: [...g.nfts, item] } : g));
		}, []);
	});
</script>

{@render children()}
