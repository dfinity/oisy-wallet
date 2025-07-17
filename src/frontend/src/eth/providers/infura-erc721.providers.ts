import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import type { Erc721ContractAddress, Erc721Metadata } from '$eth/types/erc721';
import { i18n } from '$lib/stores/i18n.store';
import { InvalidMetadataImageUrl, InvalidTokenUri } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import type { NftMetadata } from '$lib/types/nft';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { UrlSchema } from '$lib/validation/url.validation';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { InfuraProvider, type Networkish } from 'ethers/providers';
import { get } from 'svelte/store';

const ERC721_INTERFACE_ID = '0x80ac58cd';

export class InfuraErc721Provider {
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
			decimals: 0 // Erc721 contracts don't have decimals, but to avoid unexpected behavior, we set it to 0
		};
	};

	isErc721 = async ({ contractAddress }: { contractAddress: string }): Promise<boolean> => {
		const erc721Contract = new Contract(contractAddress, ERC721_ABI, this.provider);

		try {
			return await erc721Contract.supportsInterface(ERC721_INTERFACE_ID);
		} catch (_: unknown) {
			return false;
		}
	};

	getNftMetadata = async ({
		contractAddress,
		tokenId
	}: {
		contractAddress: string;
		tokenId: number;
	}): Promise<NftMetadata> => {
		const erc721Contract = new Contract(contractAddress, ERC721_ABI, this.provider);

		const resolveResourceUrl = (url: URL): URL => {
			const IPFS_PREFIX = 'ipfs://';
			if (url.href.startsWith(IPFS_PREFIX)) {
				return new URL(url.href.replace(IPFS_PREFIX, 'https://ipfs.io/ipfs/'));
			}

			return url;
		};

		const extractImageUrl = (imageUrl: string | undefined): URL | undefined => {
			if (isNullish(imageUrl)) {
				return undefined;
			}

			const parsedMetadataUrl = UrlSchema.safeParse(imageUrl);
			if (!parsedMetadataUrl.success) {
				throw new InvalidMetadataImageUrl(tokenId, contractAddress);
			}

			return resolveResourceUrl(new URL(parsedMetadataUrl.data));
		}

		const parsedTokenUri = UrlSchema.safeParse(await erc721Contract.tokenURI(tokenId));
		if (!parsedTokenUri.success) {
			throw new InvalidTokenUri(tokenId, contractAddress);
		}

		const metadataUrl = resolveResourceUrl(new URL(parsedTokenUri.data));

		const response = await fetch(metadataUrl);
		const metadata = await response.json();

		let imageUrl = extractImageUrl(metadata.image);

		const mappedAttributes = (metadata?.attributes ?? []).map(
			(attr: { trait_type: string; value: string | number }) => ({
				traitType: attr.trait_type,
				value: attr.value.toString()
			})
		);

		return {
			id: parseNftId(tokenId),
			...(nonNullish(imageUrl) && { imageUrl: imageUrl.href }),
			...(nonNullish(metadata.name) && { name: metadata.name }),
			...(mappedAttributes.length > 0 && { attributes: mappedAttributes })
		};
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
