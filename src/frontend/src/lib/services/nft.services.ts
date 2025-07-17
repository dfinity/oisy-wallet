import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { etherscanProviders, type EtherscanProvider } from '$eth/providers/etherscan.providers';
import { InfuraErc721Provider } from '$eth/providers/infura-erc721.providers';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { nftStore } from '$lib/stores/nft.store';
import type { NftMetadata } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import { ethAddressStore } from '$lib/stores/address.store';
import { get } from 'svelte/store';
import { isNullish } from '@dfinity/utils';

export const loadNfts = (tokens: Erc721CustomToken[]) => {
	const etherscanProvider = etherscanProviders(ETHEREUM_NETWORK.id);
	const infuraProvider = new InfuraErc721Provider(ETHEREUM_NETWORK.providers.infura);

	tokens.forEach((token) => loadNftsOfToken({ etherscanProvider, infuraProvider, token }));
};

const loadNftsOfToken = async ({
	etherscanProvider,
	infuraProvider,
	token
}: {
	etherscanProvider: EtherscanProvider;
	infuraProvider: InfuraErc721Provider;
	token: Erc721CustomToken;
}) => {
	const walletAddress = get(ethAddressStore)?.data // '0x29469395eaf6f95920e59f858042f0e28d98a20b'
	if (isNullish(walletAddress)) {
		return;
	}

	let tokenIds: number[];
	try {
		tokenIds = await etherscanProvider.erc721TokenInventory({
			address: walletAddress,
			contractAddress: token.address
		});
	} catch (_: unknown) {
		tokenIds = [];
	}

	const loadedTokenIds = nftStore.getTokenIds(token.address);
	const tokenIdsToLoad = tokenIds.filter((id: number) => !loadedTokenIds.includes(id));

	const tokenIdBatches = createBatches({ tokenIds: tokenIdsToLoad, batchSize: 10 });
	for (const tokenIds of tokenIdBatches) {
		const nfts = await loadNftsOfBatch({ infuraProvider, token, tokenIds });

		nftStore.addAll(nfts);
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
}) => {
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
}) => {
	const nftsMetadata: NftMetadata[] = [];
	for (const tokenId of tokenIds) {
		nftsMetadata.push(await loadNftMetadata({ infuraProvider, contractAddress, tokenId }));
	}

	return nftsMetadata;
};

const loadNftMetadata = async ({
	infuraProvider,
	contractAddress,
	tokenId
}: {
	infuraProvider: InfuraErc721Provider;
	contractAddress: string;
	tokenId: number;
}) => {
	await new Promise((resolve) => setTimeout(resolve, 200));

	try {
		return await infuraProvider.getNftMetadata({
			contractAddress,
			tokenId
		});
	} catch (_: unknown) {
		return { id: parseNftId(tokenId) };
	}
};

const createBatches = ({ tokenIds, batchSize }: { tokenIds: number[]; batchSize: number }) =>
	Array.from({ length: Math.ceil(tokenIds.length / batchSize) }, (_, index) =>
		tokenIds.slice(index * batchSize, (index + 1) * batchSize)
	);
