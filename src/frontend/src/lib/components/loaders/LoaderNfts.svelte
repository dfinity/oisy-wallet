<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { etherscanProviders } from '$eth/providers/etherscan.providers';
	import {
		type InfuraErc1155Provider,
		infuraErc1155Providers
	} from '$eth/providers/infura-erc1155.providers';
	import {
		type InfuraErc721Provider,
		infuraErc721Providers
	} from '$eth/providers/infura-erc721.providers';
	import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
	import { isTokenErc721 } from '$eth/utils/erc721.utils';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { loadNftIdsOfToken } from '$lib/services/nft.services';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NftId, NonFungibleToken, OwnedNft } from '$lib/types/nft';
	import { findNewNftIds, findRemovedNfts, getUpdatedNfts } from '$lib/utils/nfts.utils';
	import { readable } from 'svelte/store';

	const ethAddress = readable('0xffce06ddc814537ff78076df32bf4bce108ec66f');

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const handleErc721 = async (token: NonFungibleToken) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const { erc721TokenInventory } = etherscanProviders(token.network.id);

		let inventory: NftId[];
		try {
			inventory = await erc721TokenInventory({
				address: $ethAddress,
				contractAddress: token.address
			});
		} catch (_: unknown) {
			inventory = [];
		}

		handleRemovedNfts({ token, inventory });
		handleNewNfts({
			token,
			inventory,
			infuraProvider: infuraErc721Providers(token.network.id)
		});
	};

	const handleErc1155 = async (token: NonFungibleToken) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const { getNftIdsForOwner } = alchemyProviders(token.network.id);
		let inventory: OwnedNft[];
		try {
			inventory = await getNftIdsForOwner({
				address: $ethAddress,
				contractAddress: token.address
			});
		} catch (_: unknown) {
			inventory = [];
		}

		handleRemovedNfts({ token, inventory: inventory.map((ownedNft) => ownedNft.id) });
		handleUpdatedNfts({ token, inventory });
		handleNewNfts({
			token,
			inventory: inventory.map((ownedNft) => ownedNft.id),
			infuraProvider: infuraErc1155Providers(token.network.id)
		});
	};

	const handleNewNfts = ({
		token,
		inventory,
		infuraProvider
	}: {
		token: NonFungibleToken;
		inventory: NftId[];
		infuraProvider: InfuraErc721Provider | InfuraErc1155Provider;
	}) => {
		if (isNullish($ethAddress)) {
			return;
		}

		const newNftIds = findNewNftIds({ nfts: $nftStore ?? [], token, inventory });

		if (newNftIds.length > 0) {
			loadNftIdsOfToken({
				infuraProvider,
				token,
				tokenIds: newNftIds,
				walletAddress: $ethAddress
			}).catch(console.error);
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
			nftStore.removeSelectedNfts(removedNfts);
		}
	};

	const handleUpdatedNfts = ({
		token,
		inventory
	}: {
		token: NonFungibleToken;
		inventory: OwnedNft[];
	}) => {
		const updatedNfts = getUpdatedNfts({ nfts: $nftStore ?? [], token, inventory });

		if (updatedNfts.length > 0) {
			nftStore.updateSelectedNfts(updatedNfts);
		}
	};

	const onLoad = async () => {
		for (const token of $enabledNonFungibleTokens) {
			if (isTokenErc721(token)) {
				await handleErc721(token);
			}
			if (isTokenErc1155(token)) {
				await handleErc1155(token);
			}
		}
	};
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad}>
	{@render children?.()}
</IntervalLoader>
