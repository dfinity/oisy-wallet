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
	import type { Nft, NftId, NonFungibleToken, OwnedNft } from '$lib/types/nft';
	import { findNft, findRemovedNfts, mapTokenToCollection } from '$lib/utils/nfts.utils';
	import { parseNftId } from '$lib/validation/nft.validation';
	import { ethAddress } from '$lib/derived/address.derived';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const handleRemovedNfts = async ({token, nftIds}: {token: NonFungibleToken, nftIds: NftId[]}) => {
		const removedNfts = findRemovedNfts({ nfts: $nftStore ?? [], token, nftIds });

		if (removedNfts.length > 0) {
			nftStore.removeAll(removedNfts);
		}
	}

	const handleUpdatedNfts = async ({token, ownedNfts}: {token: NonFungibleToken, ownedNfts: OwnedNft[]}) => {
		const updatedNfts = ($nftStore ?? [])
			.filter((nft) => {
				if (
					nft.collection.address !== token.address ||
					nft.collection.network !== token.network
				) {
					return false;
				}

				const ownedNft = ownedNfts.find((ownedNft) => ownedNft.id === nft.id);
				return nonNullish(ownedNft) && nft.balance !== ownedNft.balance;
			})
			.map((nft) => {
				const ownedNft = ownedNfts.find((ownedNft) => ownedNft.id === nft.id);
				if (isNullish(ownedNft)) {
					return nft;
				}

				return {
					...nft,
					balance: ownedNft.balance
				};
			});

		if (updatedNfts.length > 0) {
			nftStore.updateAll(updatedNfts);
		}
	}

	const handleErc721 = async (token: NonFungibleToken) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const etherscanProvider = etherscanProviders(token.network.id);
		const inventory: NftId[] = await etherscanProvider.erc721TokenInventory({
			address: $ethAddress,
			contractAddress: token.address
		});

		const newNftIds = inventory.filter((tokenId) =>
			isNullish(findNft({ nfts: $nftStore ?? [], token, tokenId }))
		);

		await handleRemovedNfts({token, nftIds: inventory})

		if (newNftIds.length > 0) {
			const infuraErc721Provider = infuraErc721Providers(token.network.id);
			await loadNftIdsOfToken({
				infuraProvider: infuraErc721Provider,
				token,
				tokenIds: newNftIds,
				walletAddress: $ethAddress
			});
		}
	}

	const handleErc1155 = async (token: NonFungibleToken) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const alchemyProvider = alchemyProviders(token.network.id);
		const inventory = await alchemyProvider.getNftIdsForOwner({
			address: $ethAddress,
			contractAddress: token.address
		});

		const newNftIds = inventory
			.filter((ownedNft) =>
				isNullish(findNft({ nfts: $nftStore ?? [], token, tokenId: ownedNft.id }))
			)
			.map((ownedNft) => ownedNft.id);

		await handleRemovedNfts({token, nftIds: inventory.map((ownedNft) => ownedNft.id)})
		await handleUpdatedNfts({token, ownedNfts: inventory})

		if (newNftIds.length > 0) {
			const infuraErc1155Provider = infuraErc1155Providers(token.network.id);
			await loadNftIdsOfToken({
				infuraProvider: infuraErc1155Provider,
				token,
				tokenIds: newNftIds,
				walletAddress: $ethAddress
			});
		}
	}

	const onLoad = async () => {
		for (const token of $enabledNonFungibleTokens) {
			if (token.standard === 'erc721') {
				await handleErc721(token);
			}
			if (token.standard === 'erc1155') {
				await handleErc1155(token);
			}
		}
	};
</script>

<IntervalLoader {onLoad} interval={20000}>
	{@render children?.()}
</IntervalLoader>
