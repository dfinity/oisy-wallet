import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import type { Erc721ContractAddress, Erc721Metadata, Nft } from '$eth/types/erc721';
import type { NetworkId } from '$lib/types/network';
import { assertNonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { InfuraProvider, type Networkish } from 'ethers/providers';

export class InfuraERC721Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
	}

	metadata = async ({
		address
	}: Pick<Erc721ContractAddress, 'address'>): Promise<Erc721Metadata> => {
		const erc721Contract = new Contract(address, ERC721_ABI, this.provider);

		const [name, symbol] = await Promise.all([erc721Contract.name(), erc721Contract.symbol()]);

		return {
			name,
			symbol,
			decimals: 1
		};
	};

	getNftMetadata = async (contractAddress: string, tokenId: number): Promise<Nft> => {
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

			let imageUrl = metadata?.image ?? '';
			if (imageUrl.startsWith('ipfs://')) {
				imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
			}

			const mappedAttributes = (metadata?.attributes ?? []).map(
				(attr: { trait_type: string; value: string | number }) => ({
					traitType: attr.trait_type,
					value: attr.value.toString()
				})
			);

			return {
				contractName,
				contractSymbol,
				name: metadata?.name ?? '',
				attributes: mappedAttributes,
				imageUrl
			};
		} catch (error: unknown) {
			throw new Error(`Failed to fetch erc721 token metadata: ${error}`);
		}
	};
}

const providers: Record<NetworkId, InfuraERC721Provider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, InfuraERC721Provider>>(
	(acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraERC721Provider(infura) }),
	{}
);

export const infuraErc721Providers = (networkId: NetworkId): InfuraERC721Provider => {
	const provider = providers[networkId];

	assertNonNullish(provider, 'wusch');

	return provider;
};
