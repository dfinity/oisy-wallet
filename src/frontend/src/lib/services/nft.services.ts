import { alchemyProviders } from '$eth/providers/alchemy.providers';
import {
	type InfuraErc1155Provider
} from '$eth/providers/infura-erc1155.providers';
import type { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
import {
	type InfuraErc721Provider
} from '$eth/providers/infura-erc721.providers';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { nftStore } from '$lib/stores/nft.store';
import type { EthAddress, OptionEthAddress } from '$lib/types/address';
import type { Nft, NftId, NftMetadata, NonFungibleToken } from '$lib/types/nft';
import { mapTokenToCollection } from '$lib/utils/nfts.utils';
import { randomWait } from '$lib/utils/time.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { isNullish, nonNullish } from '@dfinity/utils';

export const loadNfts = async ({
	tokens,
	walletAddress
}: {
	tokens: NonFungibleToken[];
	walletAddress: OptionEthAddress;
}) => {
	if (isNullish(walletAddress)) {
		return;
	}

	for (const token of tokens) {
		const alchemyProvider = alchemyProviders(token.network.id);

		const nfts = await alchemyProvider.getNftsByOwner({ address: walletAddress, token });

		nftStore.addAll(nfts);
	}
};

export const loadNftIdsOfToken = async ({
	infuraProvider,
	token,
	tokenIds,
	walletAddress
}: {
	infuraProvider: InfuraErc721Provider | InfuraErc1155Provider;
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
	infuraProvider: InfuraErc721Provider | InfuraErc1155Provider;
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
	infuraProvider: InfuraErc721Provider | InfuraErc1155Provider;
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
	infuraProvider: InfuraErc721Provider | InfuraErc1155Provider;
	token: NonFungibleToken;
	tokenId: NftId;
}): Promise<NftMetadata> => {
	// We want to wait for a random amount of time between 0 and 2 seconds to avoid triggering rate limits.
	// Since we are handling batch sizes of 10, on average, we should wait for 0.2 seconds between each nft.
	await randomWait({ min: 0, max: 2000 });

	try {
		if (isTokenErc721(token)) {
			const { getNftMetadata } = infuraProvider;
			return await getNftMetadata({
				contractAddress: token.address,
				tokenId
			});
		}

		if (isTokenErc1155(token)) {
			const { getNftMetadata } = infuraProvider;
			return await getNftMetadata({
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
	if (isTokenErc1155(token)) {
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
