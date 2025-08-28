import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { Erc165Identifier } from '$eth/constants/erc.constants';
import { ERC1155_ABI } from '$eth/constants/erc1155.constants';
import { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
import { fetchMetadataFromUri } from '$eth/services/erc.services';
import type { Erc1155ContractAddress, Erc1155Metadata } from '$eth/types/erc1155';
import { i18n } from '$lib/stores/i18n.store';
import type { Address } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { NftId, NftMetadata } from '$lib/types/nft';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { get } from 'svelte/store';

export class InfuraErc1155Provider extends InfuraErc165Provider {
	isInterfaceErc1155 = (contract: Erc1155ContractAddress): Promise<boolean> =>
		this.isSupportedInterface({ contract, interfaceId: Erc165Identifier.ERC1155 });

	private supportsMetadataExtension = (contract: Erc1155ContractAddress): Promise<boolean> =>
		this.isSupportedInterface({ contract, interfaceId: Erc165Identifier.ERC1155_METADATA_URI });

	metadata = async ({
		address
	}: Pick<Erc1155ContractAddress, 'address'>): Promise<Erc1155Metadata> => {
		const erc1155Contract = new Contract(address, ERC1155_ABI, this.provider);

		let name;
		let symbol;

		try {
			name = await erc1155Contract.name();
		} catch (_: unknown) {
			// Since erc1155 contracts do not have to implement 'name', we don't have to handle the error here.
		}

		try {
			symbol = await erc1155Contract.symbol();
		} catch (_: unknown) {
			// Since erc1155 contracts do not have to implement 'symbol', we don't have to handle the error here.
		}

		return {
			...(nonNullish(name) && { name }),
			...(nonNullish(symbol) && { symbol }),
			decimals: 0 // Erc1155 contracts don't have decimals, but to avoid unexpected behavior, we set it to 0
		};
	};

	getNftMetadata = async ({
		contractAddress,
		tokenId
	}: {
		contractAddress: Erc1155ContractAddress['address'];
		tokenId: NftId;
	}): Promise<NftMetadata> => {
		const supportsMetadata = await this.supportsMetadataExtension({ address: contractAddress });

		if (!supportsMetadata) {
			return { id: tokenId };
		}

		const erc1155Contract = new Contract(contractAddress, ERC1155_ABI, this.provider);

		const tokenUri = await erc1155Contract.uri(tokenId);

		const { metadata, imageUrl } = await fetchMetadataFromUri({
			metadataUrl: tokenUri.replace(/{id}/g, tokenId.toString()),
			contractAddress,
			tokenId
		});

		if (isNullish(metadata)) {
			return { id: tokenId, ...(nonNullish(imageUrl) && { imageUrl: imageUrl.href }) };
		}

		const mappedAttributes =
			'attributes' in metadata
				? (metadata.attributes ?? []).map(({ trait_type: traitType, value }) => ({
						traitType,
						value: value.toString()
					}))
				: [];

		const mappedProperties =
			'properties' in metadata
				? Object.entries(metadata.properties ?? {}).map(([key, entry]) =>
						typeof entry === 'object' && !Array.isArray(entry)
							? {
									traitType: entry.name?.toString(),
									value: entry.display_value?.toString() ?? entry.value?.toString()
								}
							: {
									traitType: key,
									value: entry.toString()
								}
					)
				: [];

		return {
			id: tokenId,
			...(nonNullish(imageUrl) && { imageUrl: imageUrl.href }),
			...(nonNullish(metadata.name) && { name: metadata.name }),
			...('decimals' in metadata &&
				nonNullish(metadata.decimals) && { decimals: metadata.decimals }),
			...(nonNullish(metadata.description) &&
				notEmptyString(metadata.description) && { description: metadata.description }),
			...(mappedProperties.length > 0 && { attributes: [...mappedAttributes, ...mappedProperties] })
		};
	};

	balanceOf = async ({
		contractAddress,
		walletAddress,
		tokenId
	}: {
		contractAddress: Erc1155ContractAddress['address'];
		walletAddress: Address;
		tokenId: NftId;
	}): Promise<number> => {
		const erc1155Contract = new Contract(contractAddress, ERC1155_ABI, this.provider);
		return Number(await erc1155Contract.balanceOf(walletAddress, tokenId));
	};
}

const providers: Record<NetworkId, InfuraErc1155Provider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, InfuraErc1155Provider>>(
	(acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraErc1155Provider(infura) }),
	{}
);

export const infuraErc1155Providers = (networkId: NetworkId): InfuraErc1155Provider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_erc1155_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
