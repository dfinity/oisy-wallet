<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { etherscanProviders } from '$eth/providers/etherscan.providers';
	import { infuraErc1155Providers } from '$eth/providers/infura-erc1155.providers';
	import type { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
	import { infuraErc721Providers } from '$eth/providers/infura-erc721.providers';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { loadNftIdsOfToken } from '$lib/services/nft.services';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NftId, NonFungibleToken, OwnedNft } from '$lib/types/nft';
	import { findNewNftIds, findRemovedNfts, findUpdatedNfts } from '$lib/utils/nfts.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const handleErc721 = async (token: NonFungibleToken) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const etherscanProvider = etherscanProviders(token.network.id);

		let inventory: NftId[];
		try {
			inventory = await etherscanProvider.erc721TokenInventory({
				address: '0xffce06ddc814537ff78076df32bf4bce108ec66f',
				contractAddress: token.address
			});
		} catch (_: unknown) {
			inventory = [];
		}

		await handleRemovedNfts({ token, inventory });
		await handleNewNfts({
			token,
			inventory,
			infuraProvider: infuraErc721Providers(token.network.id)
		});
	};

	const handleErc1155 = async (token: NonFungibleToken) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const alchemyProvider = alchemyProviders(token.network.id);
		const inventory = await alchemyProvider.getNftIdsForOwner({
			address: $ethAddress,
			contractAddress: token.address
		});

		await handleRemovedNfts({ token, inventory: inventory.map((ownedNft) => ownedNft.id) });
		await handleUpdatedNfts({ token, inventory });
		await handleNewNfts({
			token,
			inventory: inventory.map((ownedNft) => ownedNft.id),
			infuraProvider: infuraErc1155Providers(token.network.id)
		});
	};

	const handleNewNfts = async ({
		token,
		inventory,
		infuraProvider
	}: {
		token: NonFungibleToken;
		inventory: NftId[];
		infuraProvider: InfuraErc165Provider;
	}) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const newNftIds = findNewNftIds({ nfts: $nftStore ?? [], token, inventory });

		if (newNftIds.length > 0) {
			await loadNftIdsOfToken({
				infuraProvider,
				token,
				tokenIds: newNftIds,
				walletAddress: $ethAddress
			});
		}
	};

	const handleRemovedNfts = ({
		token,
		inventory
	}: {
		token: NonFungibleToken;
		inventory: NftId[];
	}) => {
		const removedNfts = findRemovedNfts({ nfts: $nftStore ?? [], token, inventory });

		if (removedNfts.length > 0) {
			nftStore.removeAll(removedNfts);
		}
	};

	const handleUpdatedNfts = ({
		token,
		inventory
	}: {
		token: NonFungibleToken;
		inventory: OwnedNft[];
	}) => {
		const updatedNfts = findUpdatedNfts({ nfts: $nftStore ?? [], token, inventory });

		if (updatedNfts.length > 0) {
			nftStore.updateAll(updatedNfts);
		}
	};

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
