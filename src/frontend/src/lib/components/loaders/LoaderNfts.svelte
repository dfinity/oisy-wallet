<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { etherscanProviders } from '$eth/providers/etherscan.providers';
	import { infuraErc1155Providers } from '$eth/providers/infura-erc1155.providers';
	import { infuraErc721Providers } from '$eth/providers/infura-erc721.providers';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { loadNftIdsOfToken } from '$lib/services/nft.services';
	import { nftStore } from '$lib/stores/nft.store';
	import type { Nft, NftId, OwnedNft } from '$lib/types/nft';
	import { findNft, findRemovedNftIds, mapTokenToCollection } from '$lib/utils/nfts.utils';
	import { parseNftId } from '$lib/validation/nft.validation';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const onLoad = async () => {
		const address = '0xffce06ddc814537ff78076df32bf4bce108ec66f';

		for (const token of $enabledNonFungibleTokens) {
			const etherscanProvider = etherscanProviders(token.network.id);

			if (token.standard === 'erc721') {
				const infuraErc721Provider = infuraErc721Providers(token.network.id);

				const inventory: NftId[] = await etherscanProvider.erc721TokenInventory({
					address,
					contractAddress: token.address
				});

				const newNftIds = inventory.filter((tokenId) =>
					isNullish(findNft({ nfts: $nftStore ?? [], token, tokenId }))
				);
				const removedNfts = findRemovedNftIds({ nfts: $nftStore ?? [], token, nftIds: inventory });

				await loadNftIdsOfToken({
					infuraProvider: infuraErc721Provider,
					token,
					tokenIds: newNftIds,
					walletAddress: address
				});
			}
			if (token.standard === 'erc1155') {
				const alchemyProvider = alchemyProviders(token.network.id);

				const inventory = await alchemyProvider.getNftIdsForOwner({
					address,
					contractAddress: token.address
				});

				const newNftIds = inventory
					.filter((ownedNft) =>
						isNullish(findNft({ nfts: $nftStore ?? [], token, tokenId: ownedNft.id }))
					)
					.map((ownedNft) => ownedNft.id);
				const removedNfts = findRemovedNftIds({
					nfts: $nftStore ?? [],
					token,
					nftIds: inventory.map((ownedNft) => ownedNft.id)
				});

				const updatedNfts = ($nftStore ?? [])
					.filter((nft) => {
						if (
							nft.collection.address !== token.address ||
							nft.collection.network !== token.network
						) {
							return false;
						}

						const inventoryNft = inventory.find((ownedNft) => ownedNft.id === nft.id);
						return nonNullish(inventoryNft) && nft.balance !== inventoryNft.balance;
					})
					.map((nft) => {
						const inventoryNft = inventory.find((ownedNft) => ownedNft.id === nft.id);
						if (isNullish(inventoryNft)) {
							return nft;
						}

						return {
							...nft,
							balance: inventoryNft.balance
						};
					});

				if (newNftIds.length > 0) {
					const infuraErc1155Provider = infuraErc1155Providers(token.network.id);
					await loadNftIdsOfToken({
						infuraProvider: infuraErc1155Provider,
						token,
						tokenIds: newNftIds,
						walletAddress: address
					});
				}

				if (updatedNfts.length > 0) {
					nftStore.updateAll(updatedNfts);
				}

				if (removedNfts.length > 0) {
					nftStore.removeAll(removedNfts);
				}
			}
		}
	};
</script>

<IntervalLoader {onLoad} interval={20000}>
	{@render children?.()}
</IntervalLoader>
