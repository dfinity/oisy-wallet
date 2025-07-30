import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { Erc165Identifier } from '$eth/constants/erc.constants';
import { ERC1155_ABI } from '$eth/constants/erc1155.constants';
import { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
import { fetchMetadataFromUri } from '$eth/services/erc.services';
import type { Erc1155ContractAddress } from '$eth/types/erc1155';
import { i18n } from '$lib/stores/i18n.store';
import { InvalidTokenUri } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import type { NftId, NftMetadata } from '$lib/types/nft';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseMetadataResourceUrl } from '$lib/utils/nfts.utils';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { get } from 'svelte/store';

export class InfuraErc1155Provider extends InfuraErc165Provider {
	isInterfaceErc1155 = (contract: Erc1155ContractAddress): Promise<boolean> =>
		this.isSupportedInterface({ contract, interfaceId: Erc165Identifier.ERC1155 });

	private supportsMetadataExtension = (contract: Erc1155ContractAddress): Promise<boolean> =>
		this.isSupportedInterface({ contract, interfaceId: Erc165Identifier.ERC1155_METADATA_URI });

	uri = async ({
		contract,
		tokenId
	}: {
		contract: Erc1155ContractAddress;
		tokenId: NftId;
	}): Promise<URL | undefined> => {
		const supportsMetadata = await this.supportsMetadataExtension(contract);

		if (!supportsMetadata) {
			return;
		}

		const { address: contractAddress } = contract;

		const erc1155Contract = new Contract(contractAddress, ERC1155_ABI, this.provider);

		const rawUri = await erc1155Contract.uri(tokenId);

		return parseMetadataResourceUrl({
			url: rawUri,
			error: new InvalidTokenUri(tokenId, contractAddress)
		});
	};

	getNftMetadata = async ({
		contractAddress,
		tokenId
	}: {
		contractAddress: Erc1155ContractAddress['address'];
		tokenId: NftId;
	}): Promise<NftMetadata | undefined> => {
		const supportsMetadata = await this.supportsMetadataExtension({ address: contractAddress });

		if (!supportsMetadata) {
			return;
		}

		const erc1155Contract = new Contract(contractAddress, ERC1155_ABI, this.provider);

		const tokenUri = await erc1155Contract.uri(tokenId);

		const { metadata, imageUrl } = await fetchMetadataFromUri({
			metadataUrl: tokenUri,
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
			...(mappedProperties.length > 0 && { attributes: [...mappedAttributes, ...mappedProperties] })
		};
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
