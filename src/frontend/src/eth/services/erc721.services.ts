import { InfuraERC721Provider } from '$eth/providers/infura-erc721.providers';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import type { Address } from '$lib/types/address';
import type { Nft } from '$eth/types/erc721';
import { nftStore } from '$eth/stores/nft.store';
import { toastsError } from '$lib/stores/toasts.store';

export const loadErc721Tokens = async () => {
	await Promise.all([loadNfts()])
}

const loadNfts = async () => {
	// TODO load custom erc721 token/contract addresses


	const contractAddress = "0x3af2a97414d1101e2107a70e7f33955da1346305";
	const myWalletAddress = "0x29469395eaf6f95920e59f858042f0e28d98a20b";


	const etherscanProvider = etherscanProviders(ETHEREUM_NETWORK.id)
	const infuraProvider = new InfuraERC721Provider(ETHEREUM_NETWORK.providers.infura)

	try {
		const tokenIds = await etherscanProvider.erc721TokenInventory({ address: myWalletAddress, contractAddress })
		const nfts: Nft[] = await loadNftMetadata({infuraProvider, contractAddress, tokenIds});
		nftStore.addAll(nfts)
	} catch (err: unknown) {
		nftStore.resetAll();

		toastsError({
			msg: { text: "Failed" },
			err
		});
	}
}

const loadNftMetadata = async ({infuraProvider, contractAddress, tokenIds}: {infuraProvider: InfuraERC721Provider, contractAddress: Address, tokenIds: number[]}) => {
	const nfts: Nft[] = [];

	for (let i = 0; i < tokenIds.length; i++) {
		await new Promise(resolve => setTimeout(resolve, 100));
		nfts.push(await infuraProvider.metadata(contractAddress, tokenIds[i]))
	}

	return nfts;
}
