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
import { MediaStatusEnum } from '$lib/enums/media-status';
import { i18n } from '$lib/stores/i18n.store';
import type { WebSocketListener } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NftId, NonFungibleToken, OwnedContract } from '$lib/types/nft';
import type { TransactionResponseWithBigInt } from '$lib/types/transaction';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mapNftAttributes } from '$lib/utils/nft.utils';
import { getMediaStatusOrCache, mapTokenToCollection } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import {
	Alchemy,
	AlchemySubscription,
	NftOrdering,
	type Nft as AlchemyNft,
	type AlchemySettings,
	type Network,
	type OwnedNft,
	type OwnedNftsResponse
} from 'alchemy-sdk';
import type { Listener } from 'ethers/utils';
import { SvelteMap } from 'svelte/reactivity';
import { get } from 'svelte/store';

type AlchemyConfig = Pick<AlchemySettings, 'apiKey' | 'network'> & {
	wssUrl: string;
};

const configs: Record<NetworkId, AlchemyConfig> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, AlchemyConfig>>(
	(acc, { id, providers: { alchemy: _, alchemyDeprecated, alchemyWsUrl } }) => ({
		...acc,
		[id]: {
			apiKey: ALCHEMY_API_KEY,
			network: alchemyDeprecated,
			wssUrl: `${alchemyWsUrl}/${ALCHEMY_API_KEY}`
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

interface EthSubscriptionEnvelope<T> {
	jsonrpc: '2.0';
	method: 'eth_subscription';
	params: { subscription: string; result: T };
}

interface JsonRpcResponse {
	jsonrpc: '2.0';
	id: number;
	result?: unknown;
	error?: { code: number; message: string };
}

interface MinedTxEvent {
	removed?: boolean;
	transaction: { hash: string };
}

type PendingTxEvent =
	| string
	| { removed?: boolean; transaction: { hash: string } }
	| { hash: string };

/**
 * Generic eth_subscribe wrapper for Alchemy (and other WS JSON-RPC providers).
 * Returns a disconnect() that unsubscribes + closes the socket.
 */
const subscribeAlchemyWs = <T>({
	wssUrl,
	params,
	onEvent
}: {
	wssUrl: string;
	params: object;
	onEvent: (event: T) => void | Promise<void>;
}): WebSocketListener => {
	const ws = new WebSocket(wssUrl);

	let subscriptionId: string | null = null;
	let requestId = 1;

	const send = (payload: object) => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(payload));
		}
	};

	const onOpen = () => {
		send({
			jsonrpc: '2.0',
			id: requestId++,
			method: 'eth_subscribe',
			params
		});
	};

	const onMessage = async (event: MessageEvent<string>) => {
		const msg = JSON.parse(event.data) as JsonRpcResponse | EthSubscriptionEnvelope<T>;

		// subscribe ack
		if ('id' in msg) {
			if (typeof msg.result === 'string') {
				subscriptionId = msg.result;
			}
			return;
		}

		// events
		if (msg.method === 'eth_subscription') {
			await onEvent(msg.params.result);
		}
	};

	// use addEventListener so removeEventListener works
	ws.addEventListener('open', onOpen);
	ws.addEventListener('message', onMessage);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			if (subscriptionId && ws.readyState === WebSocket.OPEN) {
				send({
					jsonrpc: '2.0',
					id: requestId++,
					method: 'eth_unsubscribe',
					params: [subscriptionId]
				});
			}
			ws.removeEventListener('message', onMessage);
			ws.removeEventListener('open', onOpen);
			ws.close();
			subscriptionId = null;
		}
	};
};

export const initMinedTransactionsListener = ({
	listener,
	networkId,
	toAddress
}: {
	listener: Listener;
	networkId: NetworkId;
	toAddress?: EthAddress;
}): WebSocketListener =>
	subscribeAlchemyWs<MinedTxEvent>({
		wssUrl: alchemyConfig(networkId).wssUrl,
		params: [
			AlchemySubscription.MINED_TRANSACTIONS,
			{
				hashesOnly: true,
				addresses: nonNullish(toAddress) ? [{ to: toAddress }] : undefined
			}
		],
		onEvent: listener
	});

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
}): WebSocketListener =>
	subscribeAlchemyWs<PendingTxEvent>({
		wssUrl: alchemyConfig(networkId).wssUrl,
		params: [
			AlchemySubscription.PENDING_TRANSACTIONS,
			{
				toAddress,
				hashesOnly
			}
		],
		onEvent: listener
	});

const cachedNftMetadata = new SvelteMap<
	Network,
	SvelteMap<EthNonFungibleToken['address'], SvelteMap<NftId, Nft>>
>();

const getCachedNftMetadata = ({
	network,
	address,
	tokenId
}: {
	network: Network;
	address: EthNonFungibleToken['address'];
	tokenId: NftId;
}): Nft | undefined => cachedNftMetadata.get(network)?.get(address)?.get(tokenId);

const updateCachedNftMetadata = ({
	network,
	address,
	tokenId,
	metadata
}: {
	network: Network;
	address: EthNonFungibleToken['address'];
	tokenId: NftId;
	metadata: Nft;
}) => {
	const networkMap =
		cachedNftMetadata.get(network) ??
		(() => {
			const map = new SvelteMap<EthNonFungibleToken['address'], SvelteMap<NftId, Nft>>();

			cachedNftMetadata.set(network, map);

			return map;
		})();

	const addressMap =
		networkMap.get(address) ??
		(() => {
			const map = new SvelteMap<NftId, Nft>();

			networkMap.set(address, map);

			return map;
		})();

	addressMap.set(tokenId, metadata);
};

const cachedContractMetadata = new SvelteMap<
	Network,
	SvelteMap<EthAddress, Erc1155Metadata | Erc721Metadata>
>();

const getCachedContractMetadata = ({
	network,
	address
}: {
	network: Network;
	address: EthAddress;
}): Erc1155Metadata | Erc721Metadata | undefined =>
	cachedContractMetadata.get(network)?.get(address);

const updateCachedContractMetadata = ({
	network,
	address,
	metadata
}: {
	network: Network;
	address: EthAddress;
	metadata: Erc1155Metadata | Erc721Metadata;
}) => {
	const networkMap =
		cachedContractMetadata.get(network) ??
		(() => {
			const map = new SvelteMap<EthAddress, Erc1155Metadata | Erc721Metadata>();

			cachedContractMetadata.set(network, map);

			return map;
		})();

	networkMap.set(address, metadata);
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
		const mappedAttributes = mapNftAttributes(attributes);

		const mediaStatus = {
			image: await getMediaStatusOrCache(image?.originalUrl),
			thumbnail: MediaStatusEnum.INVALID_DATA
		};

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
		const cachedMetadata = getCachedNftMetadata({
			network: this.network,
			address: token.address,
			tokenId
		});

		if (nonNullish(cachedMetadata)) {
			return cachedMetadata;
		}

		const { address: contractAddress } = token;

		const nft: AlchemyNft = await this.deprecatedProvider.nft.getNftMetadata(
			contractAddress,
			tokenId
		);

		const metadata: Nft = await this.mapNftFromRpc({ nft, token });

		updateCachedNftMetadata({
			network: this.network,
			address: contractAddress,
			tokenId,
			metadata
		});

		return metadata;
	};

	// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-contracts-for-owner-v-3
	getTokensForOwner = async (address: EthAddress): Promise<OwnedContract[]> => {
		const result: AlchemyProviderContracts =
			await this.deprecatedProvider.nft.getContractsForOwner(address);

		return result.contracts.reduce<OwnedContract[]>((acc, ownedContract) => {
			const tokenStandard =
				ownedContract.tokenType === 'ERC721'
					? ('erc721' as const)
					: ownedContract.tokenType === 'ERC1155'
						? ('erc1155' as const)
						: undefined;

			if (isNullish(tokenStandard)) {
				return acc;
			}

			const newContract = {
				address: ownedContract.address,
				isSpam: ownedContract.isSpam,
				standard: tokenStandard
			};
			acc.push(newContract);

			return acc;
		}, []);
	};

	// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-metadata-endpoints/get-contract-metadata-v-3
	getContractMetadata = async (address: EthAddress): Promise<Erc1155Metadata | Erc721Metadata> => {
		const cachedMetadata = getCachedContractMetadata({
			network: this.network,
			address
		});

		if (nonNullish(cachedMetadata)) {
			return cachedMetadata;
		}

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

		const metadata: Erc1155Metadata | Erc721Metadata = {
			...(nonNullish(maybeName) && { name: maybeName }),
			...(nonNullish(result.symbol) && { symbol: result.symbol }),
			...(nonNullish(result.openSeaMetadata?.description) && {
				description: result.openSeaMetadata.description
			}),
			decimals: 0
		};

		updateCachedContractMetadata({
			network: this.network,
			address,
			metadata
		});

		return metadata;
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
