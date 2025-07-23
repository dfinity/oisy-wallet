// import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
// import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
// import { ERC1155_ABI } from '$eth/constants/erc1155.constants';
// import { InfuraErc165Provider } from '$eth/providers/infura-erc165.providers';
// import type { Erc1155ContractAddress, Erc1155Metadata } from '$eth/types/erc1155';
// import { i18n } from '$lib/stores/i18n.store';
// import { InvalidMetadataImageUrl, InvalidTokenUri } from '$lib/types/errors';
// import type { NetworkId } from '$lib/types/network';
// import type { NftMetadata } from '$lib/types/nft';
// import { replacePlaceholders } from '$lib/utils/i18n.utils';
// import { parseNftId } from '$lib/validation/nft.validation';
// import { UrlSchema } from '$lib/validation/url.validation';
// import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
// import { Contract } from 'ethers/contract';
// import { get } from 'svelte/store';
//
// export class InfuraErc1155Provider extends InfuraErc165Provider {
// 	metadata = async ({
// 		address
// 	}: Pick<Erc1155ContractAddress, 'address'>): Promise<Erc1155Metadata> => {
// 		const erc1155Contract = new Contract(address, ERC1155_ABI, this.provider);
//
// 		const [name, symbol] = await Promise.all([erc1155Contract.name(), erc1155Contract.symbol()]);
//
// 		return {
// 			name,
// 			symbol,
// 			decimals: 0 // Erc1155 contracts don't have decimals, but to avoid unexpected behavior, we set it to 0
// 		};
// 	};
//
// 	getNftMetadata = async ({
// 		contractAddress,
// 		tokenId
// 	}: {
// 		contractAddress: string;
// 		tokenId: number;
// 	}): Promise<NftMetadata> => {
// 		const erc1155Contract = new Contract(contractAddress, ERC1155_ABI, this.provider);
//
// 		const resolveResourceUrl = (url: URL): URL => {
// 			const IPFS_PREFIX = 'ipfs://';
// 			if (url.href.startsWith(IPFS_PREFIX)) {
// 				return new URL(url.href.replace(IPFS_PREFIX, 'https://ipfs.io/ipfs/'));
// 			}
//
// 			return url;
// 		};
//
// 		const extractImageUrl = (imageUrl: string | undefined): URL | undefined => {
// 			if (isNullish(imageUrl)) {
// 				return undefined;
// 			}
//
// 			const parsedMetadataUrl = UrlSchema.safeParse(imageUrl);
// 			if (!parsedMetadataUrl.success) {
// 				throw new InvalidMetadataImageUrl(tokenId, contractAddress);
// 			}
//
// 			return resolveResourceUrl(new URL(parsedMetadataUrl.data));
// 		};
//
// 		const parsedTokenUri = UrlSchema.safeParse(await erc1155Contract.tokenURI(tokenId));
// 		if (!parsedTokenUri.success) {
// 			throw new InvalidTokenUri(tokenId, contractAddress);
// 		}
//
// 		const metadataUrl = resolveResourceUrl(new URL(parsedTokenUri.data));
//
// 		const response = await fetch(metadataUrl);
// 		const metadata = await response.json();
//
// 		const imageUrl = extractImageUrl(metadata.image ?? metadata.image_url);
//
// 		const mappedAttributes = (metadata?.attributes ?? []).map(
// 			(attr: { trait_type: string; value: string | number }) => ({
// 				traitType: attr.trait_type,
// 				value: attr.value.toString()
// 			})
// 		);
//
// 		return {
// 			id: parseNftId(tokenId),
// 			...(nonNullish(imageUrl) && { imageUrl: imageUrl.href }),
// 			...(nonNullish(metadata.name) && { name: metadata.name }),
// 			...(mappedAttributes.length > 0 && { attributes: mappedAttributes })
// 		};
// 	};
// }
//
// const providers: Record<NetworkId, InfuraErc1155Provider> = [
// 	...SUPPORTED_ETHEREUM_NETWORKS,
// 	...SUPPORTED_EVM_NETWORKS
// ].reduce<Record<NetworkId, InfuraErc1155Provider>>(
// 	(acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraErc1155Provider(infura) }),
// 	{}
// );
//
// export const infuraErc1155Providers = (networkId: NetworkId): InfuraErc1155Provider => {
// 	const provider = providers[networkId];
//
// 	assertNonNullish(
// 		provider,
// 		replacePlaceholders(get(i18n).init.error.no_infura_erc1155_provider, {
// 			$network: networkId.toString()
// 		})
// 	);
//
// 	return provider;
// };
