import {InfuraProvider, type Networkish } from 'ethers/providers';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { Contract } from 'ethers';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import type { Nft } from '$eth/types/erc721';

export class InfuraERC721Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
	}

	metadata = async (contractAddress: string, tokenId: number): Promise<Nft> => {
		const erc721Contract = new Contract(contractAddress, ERC721_ABI, this.provider);

		try {
			const [contractName, contractSymbol, tokenUri] = await Promise.all([
				erc721Contract.name(),
				erc721Contract.symbol(),
				erc721Contract.tokenURI(tokenId)
			]);

			const metadataUrl = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');

			const response = await fetch(metadataUrl);
			const metadata = await response.json();

			let imageUrl = metadata?.image || '';
			if (imageUrl.startsWith('ipfs://')) {
				imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
			}

			const mappedAttributes = (metadata?.attributes || []).map(attr => ({
				traitType: attr.trait_type,
				value: attr.value.toString()
			}));

			return {
				contractName,
				contractSymbol,
				name: metadata?.name || '',
				attributes: mappedAttributes,
				imageUrl
			};
		} catch (error: unknown) {
			throw new Error(`Failed to fetch erc721 token metadata: ${error}`);
		}
	}
}