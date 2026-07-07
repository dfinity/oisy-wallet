import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import type { EthAddress } from '$eth/types/address';
import type {
	AlchemyNft,
	AlchemyOwnedNft,
	AlchemyOwnedNftsResponse,
	AlchemyProviderContract,
	AlchemyProviderContracts
} from '$eth/types/alchemy';
import type { Erc1155Metadata } from '$eth/types/erc1155';
import type { Erc721Metadata } from '$eth/types/erc721';
import type { EthereumChainId } from '$eth/types/network';
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
import type { Listener } from 'ethers/utils';
import { SvelteMap } from 'svelte/reactivity';
import { get } from 'svelte/store';
import { createPublicClient, http, isHash, type Chain, type PublicClient } from 'viem';

interface AlchemyConfig {
	wssUrl: string;
}

const ALCHEMY_SUBSCRIPTION_MINED_TRANSACTIONS = 'alchemy_minedTransactions';
const ALCHEMY_SUBSCRIPTION_PENDING_TRANSACTIONS = 'alchemy_pendingTransactions';

// Exponential-backoff reconnect schedule for the subscription WebSocket when it drops
// unexpectedly (e.g. a mobile OS suspending a backgrounded tab). An intentional disconnect()
// never reconnects. Kept local to this provider to stay decoupled from the fee-context retry.
const ALCHEMY_WS_RECONNECT_BASE_DELAY = 1_000;
const ALCHEMY_WS_RECONNECT_MAX_DELAY = 30_000;
const ALCHEMY_WS_RECONNECT_MAX_ATTEMPTS = 5;

const configs: Record<NetworkId, AlchemyConfig> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, AlchemyConfig>>(
	(acc, { id, providers: { alchemyWsUrl } }) => ({
		...acc,
		[id]: {
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
	string | { removed?: boolean; transaction: { hash: string } } | { hash: string };

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
	let ws: WebSocket;
	let subscriptionId: string | null = null;
	let requestId = 1;

	// Reconnect state. `closedByCaller` guarantees an intentional disconnect() never reconnects.
	let closedByCaller = false;
	let reconnectAttempts = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

	const send = (payload: object) => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(payload));
		}
	};

	const onOpen = () => {
		// A successful (re)connection clears the backoff.
		reconnectAttempts = 0;

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

	const scheduleReconnect = () => {
		if (closedByCaller || reconnectAttempts >= ALCHEMY_WS_RECONNECT_MAX_ATTEMPTS) {
			return;
		}

		const delay = Math.min(
			ALCHEMY_WS_RECONNECT_BASE_DELAY * 2 ** reconnectAttempts,
			ALCHEMY_WS_RECONNECT_MAX_DELAY
		);
		reconnectAttempts++;

		clearTimeout(reconnectTimer);
		reconnectTimer = setTimeout(connect, delay);
	};

	// A drop we did not initiate (e.g. the OS suspending a backgrounded tab) triggers a reconnect.
	// The WebSocket spec guarantees a `close` event even after a failed connection, so listening to
	// `close` alone is sufficient.
	const onClose = () => {
		if (!closedByCaller) {
			scheduleReconnect();
		}
	};

	// use addEventListener so removeEventListener works
	const connect = () => {
		subscriptionId = null;
		ws = new WebSocket(wssUrl);
		ws.addEventListener('open', onOpen);
		ws.addEventListener('message', onMessage);
		ws.addEventListener('close', onClose);
	};

	connect();

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			closedByCaller = true;
			clearTimeout(reconnectTimer);

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
			ws.removeEventListener('close', onClose);
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
			ALCHEMY_SUBSCRIPTION_MINED_TRANSACTIONS,
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
			ALCHEMY_SUBSCRIPTION_PENDING_TRANSACTIONS,
			{
				toAddress,
				hashesOnly
			}
		],
		onEvent: listener
	});

const cachedNftMetadata = new SvelteMap<
	NetworkId,
	SvelteMap<EthNonFungibleToken['address'], SvelteMap<NftId, Nft>>
>();

const getCachedNftMetadata = ({
	networkId,
	address,
	tokenId
}: {
	networkId: NetworkId;
	address: EthNonFungibleToken['address'];
	tokenId: NftId;
}): Nft | undefined => cachedNftMetadata.get(networkId)?.get(address)?.get(tokenId);

const updateCachedNftMetadata = ({
	networkId,
	address,
	tokenId,
	metadata
}: {
	networkId: NetworkId;
	address: EthNonFungibleToken['address'];
	tokenId: NftId;
	metadata: Nft;
}) => {
	const networkMap =
		cachedNftMetadata.get(networkId) ??
		(() => {
			const map = new SvelteMap<EthNonFungibleToken['address'], SvelteMap<NftId, Nft>>();

			cachedNftMetadata.set(networkId, map);

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
	NetworkId,
	SvelteMap<EthAddress, Erc1155Metadata | Erc721Metadata>
>();

// Prevents concurrent API calls for the same contract (thundering herd).
// While a request is in-flight, subsequent callers receive the same promise.
const inFlightContractMetadata = new Map<string, Promise<Erc1155Metadata | Erc721Metadata>>();

const getCachedContractMetadata = ({
	networkId,
	address
}: {
	networkId: NetworkId;
	address: EthAddress;
}): Erc1155Metadata | Erc721Metadata | undefined =>
	cachedContractMetadata.get(networkId)?.get(address);

const updateCachedContractMetadata = ({
	networkId,
	address,
	metadata
}: {
	networkId: NetworkId;
	address: EthAddress;
	metadata: Erc1155Metadata | Erc721Metadata;
}) => {
	const networkMap =
		cachedContractMetadata.get(networkId) ??
		(() => {
			const map = new SvelteMap<EthAddress, Erc1155Metadata | Erc721Metadata>();

			cachedContractMetadata.set(networkId, map);

			return map;
		})();

	networkMap.set(address, metadata);
};

export class AlchemyProvider {
	private readonly provider: PublicClient;
	private readonly nftBaseUrl: string;

	constructor(
		private readonly networkId: NetworkId,
		private readonly viemChain: Chain,
		private readonly alchemyJsonRpcUrl: string,
		private readonly chainId: EthereumChainId
	) {
		this.provider = createPublicClient({
			chain: this.viemChain,
			transport: http(`${this.alchemyJsonRpcUrl}/${ALCHEMY_API_KEY}`)
		});

		this.nftBaseUrl = `${new URL(this.alchemyJsonRpcUrl).origin}/nft/v3/${ALCHEMY_API_KEY}`;
	}

	// Exposes the viem read client for callers that need raw `readContract` access
	// (e.g. the Liquidium SDK's `evmPublicClient`) while keeping the full provider private.
	get readContractClient(): Pick<PublicClient, 'readContract'> {
		return this.provider;
	}

	private fetchNftApi = async <T>({
		path,
		params
	}: {
		path: string;
		params: Record<string, string | string[]>;
	}): Promise<T> => {
		const url = new URL(`${this.nftBaseUrl}/${path}`);

		for (const [key, value] of Object.entries(params)) {
			if (Array.isArray(value)) {
				for (const v of value) {
					url.searchParams.append(key, v);
				}
			} else {
				url.searchParams.append(key, value);
			}
		}

		const response = await fetch(url.toString());

		if (!response.ok) {
			throw new Error(`Alchemy NFT API error: ${response.status} ${response.statusText}`);
		}

		return response.json();
	};

	wait = async (hash: string) => {
		if (!isHash(hash)) {
			throw new Error(`Invalid transaction hash while waiting for transaction receipt: ${hash}`);
		}

		await this.provider.waitForTransactionReceipt({ hash });
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
		nft: AlchemyOwnedNft;
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
		if (!isHash(hash)) {
			throw new Error(`Invalid transaction hash while fetching transaction details: ${hash}`);
		}

		const transaction = await this.provider.getTransaction({ hash });

		if (isNullish(transaction)) {
			return transaction;
		}

		const { to, blockNumber, gas: gasLimit, input: data, ...rest } = transaction;

		return {
			...rest,
			gasLimit,
			data,
			to: to ?? undefined,
			blockNumber: Number(blockNumber),
			chainId: this.chainId
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
		const result: AlchemyOwnedNftsResponse = await this.fetchNftApi({
			path: 'getNFTsForOwner',
			params: {
				owner: address,
				withMetadata: 'true',
				orderBy: 'transferTime',
				contractAddresses: tokens.map(({ address: contractAddress }) => contractAddress)
			}
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
			networkId: this.networkId,
			address: token.address,
			tokenId
		});

		if (nonNullish(cachedMetadata)) {
			return cachedMetadata;
		}

		const { address: contractAddress } = token;

		const nft: AlchemyNft = await this.fetchNftApi({
			path: 'getNFTMetadata',
			params: {
				contractAddress,
				tokenId
			}
		});

		const metadata: Nft = await this.mapNftFromRpc({ nft, token });

		updateCachedNftMetadata({
			networkId: this.networkId,
			address: contractAddress,
			tokenId,
			metadata
		});

		return metadata;
	};

	// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-contracts-for-owner-v-3
	getTokensForOwner = async (address: EthAddress): Promise<OwnedContract[]> => {
		const result: AlchemyProviderContracts = await this.fetchNftApi({
			path: 'getContractsForOwner',
			params: {
				owner: address
			}
		});

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
			networkId: this.networkId,
			address
		});

		if (nonNullish(cachedMetadata)) {
			return cachedMetadata;
		}

		const cacheKey = `${this.networkId.description}:${address}`;

		const inFlight = inFlightContractMetadata.get(cacheKey);

		if (nonNullish(inFlight)) {
			return inFlight;
		}

		const promise = this.fetchContractMetadata(address);

		inFlightContractMetadata.set(cacheKey, promise);

		try {
			return await promise;
		} finally {
			inFlightContractMetadata.delete(cacheKey);
		}
	};

	private fetchContractMetadata = async (
		address: EthAddress
	): Promise<Erc1155Metadata | Erc721Metadata> => {
		const result: AlchemyProviderContract = await this.fetchNftApi({
			path: 'getContractMetadata',
			params: {
				contractAddress: address
			}
		});

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
			networkId: this.networkId,
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
	(acc, { id, chainId, providers: { viemChain, alchemyJsonRpcUrl } }) => ({
		...acc,
		[id]: new AlchemyProvider(id, viemChain, alchemyJsonRpcUrl, chainId)
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
