import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { Erc165Identifier } from '$eth/constants/erc.constants';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
import { fetchMetadataFromUri } from '$eth/services/erc.services';
import type { Erc721ContractAddress, Erc721Metadata } from '$eth/types/erc721';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import type { NftId, NftMetadata } from '$lib/types/nft';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mapNftAttributes } from '$lib/utils/nft.utils';
import { assertNonNullish, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import type { Networkish } from 'ethers/providers';
import { SvelteMap } from 'svelte/reactivity';
import { get } from 'svelte/store';

const cachedNftMetadata = new SvelteMap<
	Networkish,
	SvelteMap<string, SvelteMap<NftId, SvelteMap<NftId, NftMetadata>>>
>();

const getCachedNftMetadata = ({
	network,
	contractAddress,
	tokenId
}: {
	network: Networkish;
	contractAddress: Erc721ContractAddress['address'];
	tokenId: NftId;
}): NftMetadata | undefined =>
	cachedNftMetadata.get(network)?.get(contractAddress)?.get(tokenId)?.get(tokenId);

const updateCachedNftMetadata = ({
	network,
	contractAddress,
	tokenId,
	metadata
}: {
	network: Networkish;
	contractAddress: Erc721ContractAddress['address'];
	tokenId: NftId;
	metadata: NftMetadata;
}): void => {
	let networkMap = cachedNftMetadata.get(network);

	if (isNullish(networkMap)) {
		networkMap = new SvelteMap<
			Erc721ContractAddress['address'],
			SvelteMap<NftId, SvelteMap<NftId, NftMetadata>>
		>();
		cachedNftMetadata.set(network, networkMap);
	}

	let contractMap = networkMap.get(contractAddress);

	if (isNullish(contractMap)) {
		contractMap = new SvelteMap<NftId, SvelteMap<NftId, NftMetadata>>();
		networkMap.set(contractAddress, contractMap);
	}

	let tokenMap = contractMap.get(tokenId);

	if (isNullish(tokenMap)) {
		tokenMap = new SvelteMap<NftId, NftMetadata>();
		contractMap.set(tokenId, tokenMap);
	}

	tokenMap.set(tokenId, metadata);
};

export class InfuraErc721Provider extends InfuraErc165Provider {
	isInterfaceErc721 = (contract: Erc721ContractAddress): Promise<boolean> =>
		this.isSupportedInterface({ contract, interfaceId: Erc165Identifier.ERC721 });

	metadata = async ({
		address
	}: Pick<Erc721ContractAddress, 'address'>): Promise<Erc721Metadata> => {
		const erc721Contract = new Contract(address, ERC721_ABI, this.provider);

		const [name, symbol] = await Promise.all([erc721Contract.name(), erc721Contract.symbol()]);

		return {
			name,
			symbol,
			decimals: 0 // Erc721 contracts don't have decimals, but to avoid unexpected behavior, we set it to 0
		};
	};

	getNftMetadata = async ({
		contractAddress,
		tokenId
	}: {
		contractAddress: Erc721ContractAddress['address'];
		tokenId: NftId;
	}): Promise<NftMetadata> => {
		const cachedMetadata = getCachedNftMetadata({
			network: this.network,
			contractAddress,
			tokenId
		});

		if (nonNullish(cachedMetadata)) {
			return cachedMetadata;
		}

		const erc721Contract = new Contract(contractAddress, ERC721_ABI, this.provider);

		const tokenUri = await erc721Contract.tokenURI(tokenId);

		const { metadata, imageUrl } = await fetchMetadataFromUri({
			metadataUrl: tokenUri,
			contractAddress,
			tokenId
		});

		if (isNullish(metadata)) {
			return { id: tokenId, ...(nonNullish(imageUrl) && { imageUrl: imageUrl.href }) };
		}

		const mappedAttributes = 'attributes' in metadata ? mapNftAttributes(metadata.attributes) : [];

		const nftMetadata: NftMetadata = {
			id: tokenId,
			...(nonNullish(imageUrl) && { imageUrl: imageUrl.href }),
			...(nonNullish(metadata.name) && { name: metadata.name }),
			...(nonNullish(metadata.description) &&
				notEmptyString(metadata.description) && { description: metadata.description }),
			...(mappedAttributes.length > 0 && { attributes: mappedAttributes })
		};

		updateCachedNftMetadata({
			network: this.network,
			contractAddress,
			tokenId,
			metadata: nftMetadata
		});

		return nftMetadata;
	};
}

const providers: Record<NetworkId, InfuraErc721Provider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, InfuraErc721Provider>>(
	(acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraErc721Provider(infura) }),
	{}
);

export const infuraErc721Providers = (networkId: NetworkId): InfuraErc721Provider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_erc721_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
