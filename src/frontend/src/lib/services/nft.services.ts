import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { type EtherscanProvider, etherscanProviders } from '$eth/providers/etherscan.providers';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { InfuraErc721Provider } from '$eth/providers/infura-erc721.providers';
import { nftStore } from '$lib/stores/nft.store';
import type { Nft, NftMetadata } from '$lib/types/nft';
import { toastsError } from '$lib/stores/toasts.store';
import { get } from 'svelte/store';
import { i18n } from '$lib/stores/i18n.store';

export const loadNfts = (tokens: Erc721CustomToken[]) => {
	const etherscanProvider = etherscanProviders(ETHEREUM_NETWORK.id);
	const infuraProvider = new InfuraErc721Provider(ETHEREUM_NETWORK.providers.infura);

	tokens.forEach((token) => loadNftsForContract({ etherscanProvider, infuraProvider, token }));
};

const loadNftsForContract = async ({
																		 etherscanProvider,
																		 infuraProvider,
																		 token
																	 }: {
	etherscanProvider: EtherscanProvider;
	infuraProvider: InfuraErc721Provider;
	token: Erc721CustomToken;
}) => {
	const myWalletAddress = '0x29469395eaf6f95920e59f858042f0e28d98a20b'; // TODO remove this and load own wallet address

	const tokenIds = await etherscanProvider.erc721TokenInventory({
		address: myWalletAddress,
		contractAddress: token.address
	});

	const loadedTokenIds = nftStore.getTokenIds(token.address);
	const tokenIdsToLoad = tokenIds.filter((id: number) => !loadedTokenIds.includes(id));

	const batchSize = 10;
	const tokenIdBatches = Array.from(
		{ length: Math.ceil(tokenIdsToLoad.length / batchSize) },
		(_, index) => tokenIdsToLoad.slice(index * batchSize, (index + 1) * batchSize)
	);

	try {
		for (const tokenIds of tokenIdBatches) {
			const nftMetadata: NftMetadata[] = await loadNftMetadataBatch({
				infuraProvider,
				contractAddress: token.address,
				tokenIds
			});

			const nfts: Nft[] = nftMetadata.map((nftMetadata) => ({
				...nftMetadata,
				contract: token
			}));
			nftStore.addAll(nfts);
		}
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).init.error.nft_loading },
			err
		});
	}
};

const loadNftMetadataBatch = async ({
																			infuraProvider,
																			contractAddress,
																			tokenIds
																		}: {
	infuraProvider: InfuraErc721Provider;
	contractAddress: string;
	tokenIds: number[];
}) => {
	const nftMetadata: NftMetadata[] = [];

	for (let i = 0; i < tokenIds.length; i++) {
		await new Promise((resolve) => setTimeout(resolve, 200));

		nftMetadata.push(
			await infuraProvider.getNftMetadata({
				contractAddress,
				tokenId: tokenIds[i]
			})
		);
	}

	return nftMetadata;
};