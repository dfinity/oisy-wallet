import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import type { EthAddress } from '$eth/types/address';
import type {
	AlchemyProviderContract,
	AlchemyProviderContracts
} from '$eth/types/alchemy-contract';
import type { Erc1155Metadata } from '$eth/types/erc1155';
import type { Erc721Metadata } from '$eth/types/erc721';
import type { EthNonFungibleToken } from '$eth/types/nft';
import { i18n } from '$lib/stores/i18n.store';
import type { WebSocketListener } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NftAttribute, NftId, NonFungibleToken, OwnedContract } from '$lib/types/nft';
import type { TokenStandard } from '$lib/types/token';
import type { TransactionResponseWithBigInt } from '$lib/types/transaction';
import type { Option } from '$lib/types/utils';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getMediaStatusOrCache, mapTokenToCollection } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import {
	Alchemy,
	AlchemySubscription,
	NftOrdering,
	type AlchemyEventType,
	type Nft as AlchemyNft,
	type AlchemySettings,
	type Network,
	type OwnedNft,
	type OwnedNftsResponse
} from 'alchemy-sdk';
import type { Listener } from 'ethers/utils';
import { get } from 'svelte/store';

type AlchemyConfig = Pick<AlchemySettings, 'apiKey' | 'network'>;

const configs: Record<NetworkId, AlchemyConfig> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, AlchemyConfig>>(
	(acc, { id, providers: { alchemy: _, alchemyDeprecated } }) => ({
		...acc,
		[id]: {
			apiKey: ALCHEMY_API_KEY,
			network: alchemyDeprecated
		}
	}),
	{}
);

const alchemyConfig = (networkId: NetworkId): AlchemyConfig => {
	const provider = configs[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_alchemy_config, {
			$network: networkId.toString()
		})
	);

	return provider;
};

export const initMinedTransactionsListener = ({
	listener,
	networkId,
	toAddress
}: {
	listener: Listener;
	networkId: NetworkId;
	toAddress?: EthAddress;
}): WebSocketListener => {
	let provider: Alchemy | null = new Alchemy(alchemyConfig(networkId));

	const event: AlchemyEventType = {
		method: AlchemySubscription.MINED_TRANSACTIONS,
		hashesOnly: true,
		addresses: nonNullish(toAddress) ? [{ to: toAddress }] : undefined
	};

	provider.ws.on(event, listener);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			// Alchemy is buggy. Despite successfully removing all listeners, attaching new similar events would have the effect of doubling the triggers. That's why we reset it to null.
			provider?.ws.off(event);
			provider?.ws.removeAllListeners();
			provider = null;
		}
	};
};

export const initPendingTransactionsListener = ({
	toAddress,
	listener,
	networkId,
	hashesOnly = false
}: {
	toAddress: EthAddress;
	listener: Listener;
	networkId: NetworkId;
	hashesOnly?: boolean;
}): WebSocketListener => {
	let provider: Alchemy | null = new Alchemy(alchemyConfig(networkId));

	const event: AlchemyEventType = {
		method: AlchemySubscription.PENDING_TRANSACTIONS,
		toAddress,
		hashesOnly
	};

	provider.ws.on(event, listener);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			// Alchemy is buggy. Despite successfully removing all listeners, attaching new similar events would have the effect of doubling the triggers. That's why we reset it to null.
			provider?.ws.off(event);
			provider?.ws.removeAllListeners();
			provider = null;
		}
	};
};

export class AlchemyProvider {
	/**
	 * TODO: Remove this class in favor of the new provider when we remove completely alchemy-sdk
	 * @deprecated This approach works for now but does not align with the new architectural requirements.
	 */
	private readonly deprecatedProvider: Alchemy;

	constructor(private readonly network: Network) {
		this.deprecatedProvider = new Alchemy({
			apiKey: ALCHEMY_API_KEY,
			network: this.network
		});
	}

	private mapAttributes = (
		attributes:
			| {
					trait_type: string;
					value: Option<string | number>;
			  }[]
			| Record<string, Option<string | number>>
			| undefined
			| null
	): NftAttribute[] => {
		if (isNullish(attributes)) {
			return [];
		}

		if (Array.isArray(attributes)) {
			return attributes.map(({ trait_type: traitType, value }) => ({
				traitType,
				...(nonNullish(value) && { value: value.toString() })
			}));
		}

		if (typeof attributes === 'object') {
			return Object.entries(attributes).map(([traitType, value]) => ({
				traitType,
				...(nonNullish(value) && { value: value.toString() })
			}));
		}

		return [];
	};

	private mapNftFromRpc = async ({
		nft: {
			tokenId,
			name,
			description,
			raw: {
				metadata: { attributes }
			},
			image,
			acquiredAt,
			contract: { openSeaMetadata },
			balance
		},
		token
	}: {
		nft: Omit<OwnedNft, 'balance'> & Partial<Pick<OwnedNft, 'balance'>>;
		token: NonFungibleToken;
	}): Promise<Nft> => {
		const mappedAttributes = this.mapAttributes(attributes);

		const mediaStatus = await getMediaStatusOrCache(image?.originalUrl);

		const bannerMediaStatus = await getMediaStatusOrCache(openSeaMetadata?.bannerImageUrl);

		return {
			id: parseNftId(tokenId),
			...(nonNullish(name) && { name }),
			...(nonNullish(image?.originalUrl) && { imageUrl: image?.originalUrl }),
			...(nonNullish(description) && { description }),
			...(mappedAttributes.length > 0 && { attributes: mappedAttributes }),
			...(nonNullish(balance) && { balance: Number(balance) }),
			...(nonNullish(acquiredAt?.blockTimestamp) && {
				acquiredAt: new Date(acquiredAt?.blockTimestamp)
			}),
			collection: {
				...mapTokenToCollection(token),
				...(nonNullish(openSeaMetadata?.bannerImageUrl) && {
					bannerImageUrl: openSeaMetadata?.bannerImageUrl,
					bannerMediaStatus
				}),
				...(nonNullish(openSeaMetadata?.description) && {
					description: openSeaMetadata?.description
				})
			},
			mediaStatus
		} satisfies Nft;
	};

	getTransaction = async (hash: string): Promise<TransactionResponseWithBigInt | null> => {
		const transaction = await this.deprecatedProvider.core.getTransaction(hash);

		if (isNullish(transaction)) {
			return transaction;
		}

		const { value, gasLimit, gasPrice, chainId, ...rest } = transaction;

		return {
			...rest,
			value: value.toBigInt(),
			gasLimit: gasLimit.toBigInt(),
			gasPrice: gasPrice?.toBigInt(),
			chainId: BigInt(chainId)
		};
	};

	// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-nf-ts-for-owner-v-3
	getNftsByOwner = async ({
		address,
		tokens
	}: {
		address: EthAddress;
		tokens: EthNonFungibleToken[];
	}): Promise<Nft[]> => {
		const result: OwnedNftsResponse = await this.deprecatedProvider.nft.getNftsForOwner(address, {
			contractAddresses: tokens.map((token) => token.address),
			omitMetadata: false,
			orderBy: NftOrdering.TRANSFERTIME
		});

		const nftPromises = result.ownedNfts.reduce<Promise<Nft>[]>((acc, ownedNft) => {
			const token = tokens.find(({ address, network: { id: networkId } }) =>
				areAddressesEqual({
					address1: address,
					address2: ownedNft.contract.address,
					networkId
				})
			);

			// if no token found, skip adding anything to the accumulator
			if (isNullish(token)) {
				return acc;
			}

			const promise = (async () => await this.mapNftFromRpc({ nft: ownedNft, token }))();

			return [...acc, promise];
		}, []);

		return Promise.all(nftPromises);
	};

	// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-metadata-endpoints/get-nft-metadata-v-3
	getNftMetadata = async ({
		token,
		tokenId
	}: {
		token: EthNonFungibleToken;
		tokenId: NftId;
	}): Promise<Nft> => {
		const { address: contractAddress } = token;

		const nft: AlchemyNft = await this.deprecatedProvider.nft.getNftMetadata(
			contractAddress,
			tokenId
		);

		return await this.mapNftFromRpc({ nft, token });
	};

	// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-contracts-for-owner-v-3
	getTokensForOwner = async (address: EthAddress): Promise<OwnedContract[]> => {
		const result: AlchemyProviderContracts =
			await this.deprecatedProvider.nft.getContractsForOwner(address);

		return result.contracts.reduce<OwnedContract[]>((acc, ownedContract) => {
			const tokenStandard =
				ownedContract.tokenType === 'ERC721'
					? 'erc721'
					: ownedContract.tokenType === 'ERC1155'
						? 'erc1155'
						: undefined;
			if (isNullish(tokenStandard)) {
				return acc;
			}

			const newContract = {
				address: ownedContract.address,
				isSpam: ownedContract.isSpam,
				standard: tokenStandard as TokenStandard
			};
			acc.push(newContract);

			return acc;
		}, []);
	};

	// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-metadata-endpoints/get-contract-metadata-v-3
	getContractMetadata = async (address: EthAddress): Promise<Erc1155Metadata | Erc721Metadata> => {
		const result: AlchemyProviderContract =
			await this.deprecatedProvider.nft.getContractMetadata(address);

		const tokenStandard =
			result.tokenType === 'ERC721'
				? 'erc721'
				: result.tokenType === 'ERC1155'
					? 'erc1155'
					: undefined;

		if (isNullish(tokenStandard)) {
			throw new Error('Invalid token standard');
		}

		const maybeName =
			nonNullish(result.openSeaMetadata?.collectionName) &&
			!result.openSeaMetadata?.collectionName.toLowerCase().includes('unidentified')
				? result.openSeaMetadata?.collectionName
				: nonNullish(result.name)
					? result.name
					: undefined;

		return {
			...(nonNullish(maybeName) && { name: maybeName }),
			...(nonNullish(result.symbol) && { symbol: result.symbol }),
			...(nonNullish(result.openSeaMetadata?.description) && {
				description: result.openSeaMetadata.description
			}),
			decimals: 0
		};
	};
}

const providers: Record<NetworkId, AlchemyProvider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, AlchemyProvider>>(
	(acc, { id, providers: { alchemy: _, alchemyDeprecated } }) => ({
		...acc,
		[id]: new AlchemyProvider(alchemyDeprecated)
	}),
	{}
);

export const alchemyProviders = (networkId: NetworkId): AlchemyProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_alchemy_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
