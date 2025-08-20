import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import {
	infuraErc1155Providers,
	type InfuraErc1155Provider
} from '$eth/providers/infura-erc1155.providers';
import type { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
import {
	infuraErc721Providers,
	type InfuraErc721Provider
} from '$eth/providers/infura-erc721.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { EthAddress, OptionEthAddress } from '$lib/types/address';
import type { Nft, NftId, NftMetadata, NftsByNetwork, NonFungibleToken } from '$lib/types/nft';
import { getNftsByNetworks, mapTokenToCollection } from '$lib/utils/nfts.utils';
import { randomWait } from '$lib/utils/time.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { isNullish, nonNullish } from '@dfinity/utils';

export const loadNfts = async ({
	tokens,
	loadedNfts,
	walletAddress
}: {
	tokens: NonFungibleToken[];
	loadedNfts: Nft[];
	walletAddress: OptionEthAddress;
}) => {
	if (isNullish(walletAddress)) {
		return;
	}

	const loadedNftsByNetwork: NftsByNetwork = getNftsByNetworks({ tokens, nfts: loadedNfts });

	await Promise.all(
		tokens.map((token) => {
			const loadedNfts = getLoadedNfts({ token, loadedNftsByNetwork });

			if (token.standard === 'erc721') {
				const infuraErc721Provider = infuraErc721Providers(token.network.id);

				return loadNftsOfToken({
					infuraProvider: infuraErc721Provider,
					token,
					loadedNfts,
					walletAddress
				});
			}
			if (token.standard === 'erc1155') {
				const infuraErc1155Provider = infuraErc1155Providers(token.network.id);

				return loadNftsOfToken({
					infuraProvider: infuraErc1155Provider,
					token,
					loadedNfts,
					walletAddress
				});
			}
		})
	);
};

const loadNftsOfToken = async ({
	infuraProvider,
	token,
	loadedNfts,
	walletAddress
}: {
	infuraProvider: InfuraErc165Provider;
	token: NonFungibleToken;
	loadedNfts: Nft[];
	walletAddress: EthAddress;
}) => {
	const holdersTokenIds = await loadHoldersTokenIds({
		walletAddress,
		token
	});

	const loadedTokenIds: NftId[] = loadedNfts.map((nft) => nft.id);
	const tokenIdsToLoad = holdersTokenIds.filter((id: NftId) => !loadedTokenIds.includes(id));

	await loadNftIdsOfToken({ infuraProvider, token, tokenIds: tokenIdsToLoad, walletAddress });
};

export const loadNftIdsOfToken = async ({
	infuraProvider,
	token,
	tokenIds,
	walletAddress
}: {
	infuraProvider: InfuraErc165Provider;
	token: NonFungibleToken;
	tokenIds: NftId[];
	walletAddress: EthAddress;
}) => {
	const tokenIdBatches = createBatches({ tokenIds, batchSize: 10 });
	for (const tokenIds of tokenIdBatches) {
		try {
			const nfts = await loadNftsOfBatch({
				infuraProvider,
				walletAddress,
				token,
				tokenIds
			});

			nftStore.addAll(nfts);
		} catch (err: unknown) {
			console.warn('Failed to load batch of nfts', err);
		}
	}
};

const loadNftsOfBatch = async ({
	infuraProvider,
	walletAddress,
	token,
	tokenIds
}: {
	infuraProvider: InfuraErc165Provider;
	walletAddress: EthAddress;
	token: NonFungibleToken;
	tokenIds: NftId[];
}): Promise<Nft[]> => {
	const nftsMetadata: NftMetadata[] = await loadNftsMetadata({
		infuraProvider,
		token,
		tokenIds
	});

	return await getNfts({ infuraProvider, token, walletAddress, nftsMetadata });
};

const loadNftsMetadata = async ({
	infuraProvider,
	token,
	tokenIds
}: {
	infuraProvider: InfuraErc165Provider;
	token: NonFungibleToken;
	tokenIds: NftId[];
}): Promise<NftMetadata[]> => {
	const metadataPromises = tokenIds.map((tokenId) =>
		loadNftMetadata({ infuraProvider, token, tokenId })
	);

	const results = await Promise.allSettled(metadataPromises);
	return results.reduce<NftMetadata[]>((acc, result) => {
		if (result.status !== 'fulfilled') {
			// For development purposes, we want to see the error in the console.
			console.warn(result.reason);

			return acc;
		}

		const { value } = result;

		return nonNullish(value) ? [...acc, value] : acc;
	}, []);
};

const loadNftMetadata = async ({
	infuraProvider,
	token,
	tokenId
}: {
	infuraProvider: InfuraErc165Provider;
	token: NonFungibleToken;
	tokenId: NftId;
}): Promise<NftMetadata> => {
	// We want to wait for a random amount of time between 0 and 2 seconds to avoid triggering rate limits.
	// Since we are handling batch sizes of 10, on average, we should wait for 0.2 seconds between each nft.
	await randomWait({ min: 0, max: 2000 });

	try {
		if (token.standard === 'erc721') {
			const infuraErc721Provider = infuraProvider as InfuraErc721Provider;
			return await infuraErc721Provider.getNftMetadata({
				contractAddress: token.address,
				tokenId
			});
		}
		if (token.standard === 'erc1155') {
			const infuraErc1155Provider = infuraProvider as InfuraErc1155Provider;
			return await infuraErc1155Provider.getNftMetadata({
				contractAddress: token.address,
				tokenId
			});
		}

		return { id: parseNftId(tokenId) };
	} catch (err: unknown) {
		console.warn('Failed to load metadata', err);
		return { id: parseNftId(tokenId) };
	}
};

const getNfts = async ({
	infuraProvider,
	token,
	walletAddress,
	nftsMetadata
}: {
	infuraProvider: InfuraErc165Provider;
	token: NonFungibleToken;
	walletAddress: EthAddress;
	nftsMetadata: NftMetadata[];
}): Promise<Nft[]> => {
	const nftPromises = nftsMetadata.map((nftMetadata) =>
		getNft({ infuraProvider, token, walletAddress, nftMetadata })
	);

	const results = await Promise.allSettled(nftPromises);
	return results.reduce<Nft[]>((acc, result) => {
		if (result.status !== 'fulfilled') {
			console.warn(result.reason);
			return acc;
		}

		const { value } = result;
		return nonNullish(value) ? [...acc, value] : acc;
	}, []);
};

const getNft = async ({
	infuraProvider,
	token,
	walletAddress,
	nftMetadata
}: {
	infuraProvider: InfuraErc165Provider;
	token: NonFungibleToken;
	walletAddress: EthAddress;
	nftMetadata: NftMetadata;
}): Promise<Nft> => {
	let balance;
	if (token.standard === 'erc1155') {
		const infuraErc1155Provider = infuraProvider as InfuraErc1155Provider;
		balance = await loadBalance({
			infuraProvider: infuraErc1155Provider,
			contractAddress: token.address,
			walletAddress,
			tokenId: nftMetadata.id
		});
	}

	return {
		...nftMetadata,
		collection: mapTokenToCollection(token),
		...(nonNullish(balance) && { balance })
	};
};

const loadBalance = async ({
	infuraProvider,
	contractAddress,
	walletAddress,
	tokenId
}: {
	infuraProvider: InfuraErc1155Provider;
	contractAddress: EthAddress;
	walletAddress: EthAddress;
	tokenId: NftId;
}): Promise<number | undefined> => {
	// We want to wait for a random amount of time between 0 and 2 seconds to avoid triggering rate limits.
	// Since we are handling batch sizes of 10, on average, we should wait for 0.2 seconds between each nft.
	await randomWait({ min: 0, max: 2000 });

	try {
		return await infuraProvider.balanceOf({ contractAddress, walletAddress, tokenId });
	} catch (err: unknown) {
		console.warn('Failed to load balance', err);
	}
};

const createBatches = ({
	tokenIds,
	batchSize
}: {
	tokenIds: NftId[];
	batchSize: number;
}): NftId[][] =>
	Array.from({ length: Math.ceil(tokenIds.length / batchSize) }, (_, index) =>
		tokenIds.slice(index * batchSize, (index + 1) * batchSize)
	);

const loadHoldersTokenIds = async ({
	walletAddress,
	token
}: {
	walletAddress: EthAddress;
	token: NonFungibleToken;
}): Promise<NftId[]> => {
	try {
		if (token.standard === 'erc721') {
			const etherscanProvider = etherscanProviders(token.network.id);

			return await etherscanProvider.erc721TokenInventory({
				address: walletAddress,
				contractAddress: token.address
			});
		}
		if (token.standard === 'erc1155') {
			const alchemyProvider = alchemyProviders(token.network.id);

			return (
				await alchemyProvider.getNftIdsForOwner({
					address: walletAddress,
					contractAddress: token.address
				})
			).map((ownedNft) => parseNftId(ownedNft.id));
		}

		return [];
	} catch (_: unknown) {
		return [];
	}
};

const getLoadedNfts = ({
	token: {
		network: { id: networkId },
		address
	},
	loadedNftsByNetwork
}: {
	token: NonFungibleToken;
	loadedNftsByNetwork: NftsByNetwork;
}): Nft[] => {
	const tokensByNetwork = loadedNftsByNetwork[networkId];
	if (nonNullish(tokensByNetwork)) {
		return tokensByNetwork[address.toLowerCase()] ?? [];
	}

	return [];
};
