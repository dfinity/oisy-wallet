import { alchemyProviders, type AlchemyProvider } from '$eth/providers/alchemy.providers';
import { etherscanProviders, type EtherscanProvider } from '$eth/providers/etherscan.providers';
import {
	InfuraErc1155Provider,
	infuraErc1155Providers
} from '$eth/providers/infura-erc1155.providers';
import type { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
import {
	InfuraErc721Provider,
	infuraErc721Providers
} from '$eth/providers/infura-erc721.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { Nft, NftId, NftMetadata, NftsByNetwork, NonFungibleToken } from '$lib/types/nft';
import { getNftsByNetworks } from '$lib/utils/nfts.utils';
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
			const etherscanProvider = etherscanProviders(token.network.id);
			const alchemyProvider = alchemyProviders(token.network.id);

			const loadedNfts = getLoadedNfts({ token, loadedNftsByNetwork });

			if (token.standard === 'erc721') {
				const infuraErc721Provider = infuraErc721Providers(token.network.id);

				return loadNftsOfToken({
					etherscanProvider,
					infuraProvider: infuraErc721Provider,
					alchemyProvider,
					token,
					loadedNfts,
					walletAddress
				});
			}
			if (token.standard === 'erc1155') {
				const infuraErc1155Provider = infuraErc1155Providers(token.network.id);

				return loadNftsOfToken({
					etherscanProvider,
					infuraProvider: infuraErc1155Provider,
					alchemyProvider,
					token,
					loadedNfts,
					walletAddress
				});
			}
		})
	);
};

const loadNftsOfToken = async ({
	etherscanProvider,
	infuraProvider,
	alchemyProvider,
	token,
	loadedNfts,
	walletAddress
}: {
	etherscanProvider: EtherscanProvider;
	infuraProvider: InfuraErc165Provider;
	alchemyProvider: AlchemyProvider;
	token: NonFungibleToken;
	loadedNfts: Nft[];
	walletAddress: string;
}) => {
	const holdersTokenIds = await loadHoldersTokenIds({
		etherscanProvider,
		alchemyProvider,
		walletAddress,
		token
	});

	const loadedTokenIds: NftId[] = loadedNfts.map((nft) => nft.id);
	const tokenIdsToLoad = holdersTokenIds.filter((id: NftId) => !loadedTokenIds.includes(id));

	const tokenIdBatches = createBatches({ tokenIds: tokenIdsToLoad, batchSize: 10 });
	for (const tokenIds of tokenIdBatches) {
		try {
			const nfts = await loadNftsOfBatch({
				infuraProvider,
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
	token,
	tokenIds
}: {
	infuraProvider: InfuraErc165Provider;
	token: NonFungibleToken;
	tokenIds: NftId[];
}): Promise<Nft[]> => {
	const nftsMetadata: NftMetadata[] = await loadNftsMetadata({
		infuraProvider,
		token,
		tokenIds
	});

	return nftsMetadata.map((nftMetadata) => ({
		...nftMetadata,
		contract: token
	}));
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
		if (token.standard === 'erc721' && infuraProvider instanceof InfuraErc721Provider) {
			return await infuraProvider.getNftMetadata({
				contractAddress: token.address,
				tokenId
			});
		}
		if (token.standard === 'erc1155' && infuraProvider instanceof InfuraErc1155Provider) {
			return await infuraProvider.getNftMetadata({
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
	etherscanProvider,
	alchemyProvider,
	walletAddress,
	token
}: {
	etherscanProvider: EtherscanProvider;
	alchemyProvider: AlchemyProvider;
	walletAddress: string;
	token: NonFungibleToken;
}): Promise<NftId[]> => {
	try {
		if (token.standard === 'erc721') {
			return await etherscanProvider.erc721TokenInventory({
				address: walletAddress,
				contractAddress: token.address
			});
		}
		if (token.standard === 'erc1155') {
			return await alchemyProvider.getNftIdsForOwner({
				address: walletAddress,
				contractAddress: token.address
			});
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
