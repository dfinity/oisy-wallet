import { etherscanProviders, type EtherscanProvider } from '$eth/providers/etherscan.providers';
import {
	infuraErc721Providers,
	type InfuraErc721Provider
} from '$eth/providers/infura-erc721.providers';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { nftStore } from '$lib/stores/nft.store';
import type { Nft, NftId, NftMetadata, NftsByNetwork } from '$lib/types/nft';
import { getNftsByNetworks } from '$lib/utils/nfts.utils';
import { randomWait } from '$lib/utils/time.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { nonNullish } from '@dfinity/utils';

export const loadNfts = ({
	tokens,
	loadedNfts,
	walletAddress
}: {
	tokens: Erc721CustomToken[];
	loadedNfts: Nft[];
	walletAddress: string;
}): Promise<void[]> => {
	const loadedNftsByNetwork: NftsByNetwork = getNftsByNetworks({ tokens, nfts: loadedNfts });

	return Promise.all(
		tokens.map((token) => {
			const etherscanProvider = etherscanProviders(token.network.id);
			const infuraProvider = infuraErc721Providers(token.network.id);

			const loadedNfts = getLoadedNfts({ token, loadedNftsByNetwork });

			return loadNftsOfToken({
				etherscanProvider,
				infuraProvider,
				token,
				loadedNfts,
				walletAddress
			});
		})
	);
};

const loadNftsOfToken = async ({
	etherscanProvider,
	infuraProvider,
	token,
	loadedNfts,
	walletAddress
}: {
	etherscanProvider: EtherscanProvider;
	infuraProvider: InfuraErc721Provider;
	token: Erc721CustomToken;
	loadedNfts: Nft[];
	walletAddress: string;
}): Promise<void> => {
	const holdersTokenIds = await loadHoldersTokenIds({
		etherscanProvider,
		walletAddress,
		contractAddress: token.address
	});

	const loadedTokenIds: NftId[] = loadedNfts.map((nft) => nft.id);
	const tokenIdsToLoad = holdersTokenIds.filter(
		(id: number) => !loadedTokenIds.includes(parseNftId(id))
	);

	const tokenIdBatches = createBatches({ tokenIds: tokenIdsToLoad, batchSize: 10 });
	for (const tokenIds of tokenIdBatches) {
		try {
			const nfts = await loadNftsOfBatch({ infuraProvider, token, tokenIds });

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
	infuraProvider: InfuraErc721Provider;
	token: Erc721CustomToken;
	tokenIds: number[];
}): Promise<Nft[]> => {
	const nftsMetadata: NftMetadata[] = await loadNftsMetadata({
		infuraProvider,
		contractAddress: token.address,
		tokenIds
	});

	return nftsMetadata.map((nftMetadata) => ({
		...nftMetadata,
		contract: token
	}));
};

const loadNftsMetadata = async ({
	infuraProvider,
	contractAddress,
	tokenIds
}: {
	infuraProvider: InfuraErc721Provider;
	contractAddress: string;
	tokenIds: number[];
}): Promise<NftMetadata[]> => {
	const metadataPromises = tokenIds.map((tokenId) =>
		loadNftMetadata({ infuraProvider, contractAddress, tokenId })
	);
	const results = await Promise.allSettled(metadataPromises);
	return results.reduce<NftMetadata[]>((acc, result) => {
		if (result.status !== 'fulfilled') {
			// For development purposes, we want to see the error in the console.
			console.error(result.reason);

			return acc;
		}

		const { value } = result;

		return nonNullish(value) ? [...acc, value] : acc;
	}, []);
};

const loadNftMetadata = async ({
	infuraProvider,
	contractAddress,
	tokenId
}: {
	infuraProvider: InfuraErc721Provider;
	contractAddress: string;
	tokenId: number;
}): Promise<NftMetadata> => {
	await randomWait({ min: 0, max: 2000 });

	try {
		return await infuraProvider.getNftMetadata({
			contractAddress,
			tokenId
		});
	} catch (err: unknown) {
		console.warn('Failed to load metadata', err);
		return { id: parseNftId(tokenId) };
	}
};

const createBatches = ({
	tokenIds,
	batchSize
}: {
	tokenIds: number[];
	batchSize: number;
}): number[][] =>
	Array.from({ length: Math.ceil(tokenIds.length / batchSize) }, (_, index) =>
		tokenIds.slice(index * batchSize, (index + 1) * batchSize)
	);

const loadHoldersTokenIds = async ({
	etherscanProvider,
	walletAddress,
	contractAddress
}: {
	etherscanProvider: EtherscanProvider;
	walletAddress: string;
	contractAddress: string;
}): Promise<number[]> => {
	try {
		return await etherscanProvider.erc721TokenInventory({
			address: walletAddress,
			contractAddress
		});
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
	token: Erc721CustomToken;
	loadedNftsByNetwork: NftsByNetwork;
}): Nft[] => {
	const tokensByNetwork = loadedNftsByNetwork[networkId];
	if (nonNullish(tokensByNetwork)) {
		return tokensByNetwork[address.toLowerCase()] ?? [];
	}

	return [];
};
