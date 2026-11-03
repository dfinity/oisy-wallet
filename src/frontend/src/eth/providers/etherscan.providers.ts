import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ETHERSCAN_API_KEY } from '$env/rest/etherscan.env';
import type { EthAddress } from '$eth/types/address';
import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc721Token } from '$eth/types/erc721';
import type { EtherscanProviderTokenId } from '$eth/types/etherscan-token';
import type {
	EtherscanProviderErc1155TokenTransferTransaction,
	EtherscanProviderErc721TokenTransferTransaction,
	EtherscanProviderInternalTransaction,
	EtherscanProviderTokenTransferTransaction,
	EtherscanProviderTransaction
} from '$eth/types/etherscan-transaction';
import type { EthereumChainId } from '$eth/types/network';
import { i18n } from '$lib/stores/i18n.store';
import type { Address } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { NftId } from '$lib/types/nft';
import type { Transaction } from '$lib/types/transaction';
import { consoleWarn } from '$lib/utils/console.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import {
	EtherscanProvider as EtherscanProviderLib,
	Network,
	type BlockTag
} from 'ethers/providers';
import { FetchRequest } from 'ethers/utils';
import { get } from 'svelte/store';

interface TransactionsParams {
	address: EthAddress;
	startBlock?: BlockTag;
	endBlock?: BlockTag;
	sort?: 'asc' | 'desc';
}

// The single method of `EtherscanProviderLib` this module uses. Declaring it keeps the fallback
// below honest: anything more the wrapper starts calling has to be implemented there too.
interface EtherscanFetcher {
	// Generic rather than `unknown` to match `EtherscanProviderLib.fetch`, whose `any` lets each
	// call site below declare the shape it expects. The response is unvalidated either way — the
	// library does not check it against a schema, and neither does the fallback.
	fetch: <T>({ module, params }: { module: string; params: Record<string, unknown> }) => Promise<T>;
}

const ETHERSCAN_V2_API_URL = 'https://api.etherscan.io/v2/api';

// Mirrors the library's own `THROTTLE` (`provider-etherscan.js`): how long to stall before
// retrying a request Etherscan answered with a rate-limit payload.
const ETHERSCAN_THROTTLE_MS = 2000;

/**
 * Etherscan transport for a chain `ethers` does not list.
 *
 * `EtherscanProviderLib`'s constructor asserts the chain id against a hardcoded array in
 * `provider-etherscan.js`, and that array trails new chains — Robinhood Chain (4663) is absent.
 * The assert is the only chain-specific thing in it: Etherscan v2 serves every chain from one
 * host selected by a `chainid` query parameter, and ethers' own `getBaseUrl` is documented as
 * deprecated and unused for v2. `Network.register` does not help, because the assert reads the
 * literal array rather than the network registry.
 *
 * So the URL is built the same way ethers builds it, over the same `FetchRequest`, and with the
 * same rate-limit `processFunc` — the throttling behaviour has to be mirrored deliberately, not
 * merely inherited from `FetchRequest`, because Etherscan reports throttling as a 200.
 *
 * Only the non-`proxy` response shape is handled, because that is all this module asks for;
 * `proxy` would need the JSON-RPC envelope checks as well.
 */
class EtherscanV2Provider implements EtherscanFetcher {
	constructor(private readonly chainId: EthereumChainId) {}

	fetch = async <T>({
		module,
		params
	}: {
		module: string;
		params: Record<string, unknown>;
	}): Promise<T> => {
		if (!ETHERSCAN_API_KEY) {
			throw new Error('Etherscan API key is not configured: set VITE_ETHERSCAN_API_KEY.');
		}

		const query = Object.entries(params).reduce(
			(acc, [key, value]) => (nonNullish(value) ? `${acc}&${key}=${value}` : acc),
			''
		);

		const request = new FetchRequest(
			`${ETHERSCAN_V2_API_URL}?chainid=${this.chainId}&module=${module}${query}&apikey=${ETHERSCAN_API_KEY}`
		);
		request.setThrottleParams({ slotInterval: 1000 });

		// Etherscan signals throttling with **HTTP 200** and a rate-limit string in `result`, so
		// `assertOk` below never sees it and the status check would turn a retryable condition
		// into a hard failure. `throwThrottleError` from inside `processFunc` is what makes
		// `FetchRequest` wait and retry instead — it handles the throttle error itself, without
		// consulting `retryFunc`, which is why the library's `retryFunc` is not mirrored here.
		// This matters in practice: one Etherscan key is shared across every chain, at 5 req/s.
		// The two positional parameters are `FetchRequest`'s callback shape, not ours to choose.
		// eslint-disable-next-line local-rules/prefer-object-params
		request.processFunc = (_req, response) => {
			const { result }: { result?: unknown } = response.hasBody() ? response.bodyJson : {};

			if (typeof result === 'string' && result.toLowerCase().includes('rate limit')) {
				response.throwThrottleError(result, ETHERSCAN_THROTTLE_MS);
			}

			return Promise.resolve(response);
		};

		const response = await request.send();

		response.assertOk();

		const { status, message, result } = response.bodyJson;

		// Etherscan reports an empty history as a failure with a distinguishing message; ethers
		// treats those two as success, and so must we, or a wallet with no activity on the chain
		// surfaces an error instead of an empty list.
		if (
			`${status}` === '0' &&
			(message === 'No records found' || message === 'No transactions found')
		) {
			return result as T;
		}

		if (`${status}` !== '1' || (typeof message === 'string' && !message.startsWith('OK'))) {
			throw new Error(`Etherscan error response: ${message ?? ''} ${result ?? ''}`.trim());
		}

		return result as T;
	};
}

/**
 * `EtherscanProviderLib` when ethers lists the chain, the stand-in above when it does not.
 *
 * The choice is made by attempting construction rather than by re-declaring ethers' array of
 * supported chain ids, which is module-private and grows with each release: a copy here would
 * drift silently. Attempting it instead means a chain moves back onto the library's own
 * implementation the moment an ethers upgrade starts listing it, with no edit here. Only ethers'
 * argument assert is caught — anything else is a real fault and is rethrown.
 */
const etherscanFetcher = ({
	network,
	chainId
}: {
	network: Network;
	chainId: EthereumChainId;
}): EtherscanFetcher => {
	try {
		const provider = new EtherscanProviderLib(network, ETHERSCAN_API_KEY);

		// Adapted rather than returned directly, so both branches share one object-shaped
		// signature; the library's own call stays positional.
		return { fetch: async ({ module, params }) => await provider.fetch(module, params) };
	} catch (err: unknown) {
		const { code } = (err ?? {}) as { code?: string };

		// The chain-id assert is the only `INVALID_ARGUMENT` this constructor can reach: `super()`
		// is called without a network, so `AbstractProvider` never runs `Network.from`, and the
		// `Network.from` here returns a clone before any of its own asserts for the `Network`
		// instance the registry below always passes. So the code alone discriminates, and
		// narrowing further — on the message — would only add a way to fail: the registry is built
		// at module scope, so rethrowing after an ethers reword would take the module down at
		// import. Diverting when we need not costs nothing by comparison; the fallback derives its
		// URL from our own env chain id either way.
		if (code !== 'INVALID_ARGUMENT') {
			throw err;
		}

		// Expected for a chain ethers does not list, hence a warning and not an error — but it is
		// also the only signal if that assumption ever stops holding, so it must not be silent.
		consoleWarn(
			`ethers rejected chain ${chainId} for its own Etherscan provider; using the Etherscan v2 transport.`,
			err
		);

		return new EtherscanV2Provider(chainId);
	}
};

export class EtherscanProvider {
	private readonly provider: EtherscanFetcher;

	constructor(
		private readonly network: Network,
		private readonly chainId: EthereumChainId
	) {
		this.provider = etherscanFetcher({ network: this.network, chainId: this.chainId });
	}

	// There is no `getHistory` in ethers v6
	// Issue report: https://github.com/ethers-io/ethers.js/issues/4303
	// Workaround: https://ethereum.stackexchange.com/questions/147756/read-transaction-history-with-ethers-v6-1-0/150836#150836
	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
	private async getHistory({
		address,
		startBlock,
		endBlock,
		sort
	}: TransactionsParams): Promise<Transaction[]> {
		const params = {
			action: 'txlist',
			address,
			startblock: startBlock ?? 0,
			...(nonNullish(endBlock) ? { endblock: endBlock } : {}),
			sort: sort ?? 'asc'
		};

		const result: EtherscanProviderTransaction[] = await this.provider.fetch({
			module: 'account',
			params
		});

		return result.map(
			({
				blockNumber,
				timeStamp,
				hash,
				nonce,
				from,
				to,
				value,
				gas,
				gasPrice,
				gasUsed,
				input: data
			}: EtherscanProviderTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				gasUsed: BigInt(gasUsed),
				value: BigInt(value),
				chainId: this.chainId,
				data
			})
		);
	}

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-internal-transactions-by-address
	private async getInternalHistory({
		address,
		startBlock,
		endBlock,
		sort
	}: TransactionsParams): Promise<Transaction[]> {
		const params = {
			action: 'txlistinternal',
			address,
			startblock: startBlock ?? 0,
			...(nonNullish(endBlock) ? { endblock: endBlock } : {}),
			sort: sort ?? 'asc'
		};

		const result: EtherscanProviderInternalTransaction[] = await this.provider.fetch({
			module: 'account',
			params
		});

		return result.map(
			({
				blockNumber,
				timeStamp,
				hash,
				from,
				to,
				value,
				gas,
				input: data
			}: EtherscanProviderInternalTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: 0,
				gasLimit: BigInt(gas),
				value: BigInt(value),
				chainId: this.chainId,
				data
			})
		);
	}

	transactions = async (params: TransactionsParams): Promise<Transaction[]> => {
		const results = await Promise.all([this.getHistory(params), this.getInternalHistory(params)]);

		return results.flat();
	};

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
	erc20Transactions = async ({
		address,
		contract: { address: contractAddress },
		startBlock,
		endBlock,
		sort
	}: Omit<TransactionsParams, 'address'> & {
		address: EthAddress;
		contract: Erc20Token | Erc4626Token;
	}): Promise<Transaction[]> => {
		const params = {
			action: 'tokentx',
			contractAddress,
			address,
			startblock: startBlock ?? 0,
			...(nonNullish(endBlock) ? { endblock: endBlock } : {}),
			sort: sort ?? 'desc'
		};

		const result: EtherscanProviderTokenTransferTransaction[] | string = await this.provider.fetch({
			module: 'account',
			params
		});

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(
			({
				nonce,
				gas,
				gasPrice,
				gasUsed,
				hash,
				blockNumber,
				timeStamp,
				from,
				to,
				value,
				input: data
			}: EtherscanProviderTokenTransferTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				gasUsed: BigInt(gasUsed),
				value: BigInt(value),
				chainId: this.chainId,
				data
			})
		);
	};

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc721-token-transfer-events-by-address
	erc721Transactions = async ({
		address,
		contract: { address: contractAddress }
	}: {
		address: EthAddress;
		contract: Erc721Token;
	}): Promise<Transaction[]> => {
		const params = {
			action: 'tokennfttx',
			contractAddress,
			address,
			startblock: 0,
			sort: 'desc'
		};

		const result: EtherscanProviderErc721TokenTransferTransaction[] | string =
			await this.provider.fetch({ module: 'account', params });

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(
			({
				nonce,
				gas,
				gasPrice,
				gasUsed,
				hash,
				blockNumber,
				timeStamp,
				from,
				to,
				tokenID,
				input: data
			}: EtherscanProviderErc721TokenTransferTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				value: BigInt(1),
				tokenId: parseInt(tokenID),
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				gasUsed: BigInt(gasUsed),
				chainId: this.chainId,
				data
			})
		);
	};

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc1155-token-transfer-events-by-address
	erc1155Transactions = async ({
		address,
		contract: { address: contractAddress }
	}: {
		address: EthAddress;
		contract: Erc1155Token;
	}): Promise<Transaction[]> => {
		const params = {
			action: 'token1155tx',
			contractAddress,
			address,
			startblock: 0,
			sort: 'desc'
		};

		const result: EtherscanProviderErc1155TokenTransferTransaction[] | string =
			await this.provider.fetch({ module: 'account', params });

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(
			({
				nonce,
				gas,
				gasPrice,
				gasUsed,
				hash,
				blockNumber,
				timeStamp,
				from,
				to,
				tokenID,
				tokenValue,
				input: data
			}: EtherscanProviderErc1155TokenTransferTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				value: BigInt(tokenValue),
				tokenId: parseInt(tokenID),
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				gasUsed: BigInt(gasUsed),
				chainId: this.chainId,
				data
			})
		);
	};

	// https://docs.etherscan.io/api-endpoints/tokens#get-address-erc721-token-inventory-by-contract-address
	erc721TokenInventory = async ({
		address,
		contractAddress
	}: {
		address: EthAddress;
		contractAddress: Address;
	}): Promise<NftId[]> => {
		const params = {
			action: 'addresstokennftinventory',
			address,
			contractaddress: contractAddress,
			startblock: 0,
			sort: 'desc'
		};

		const result: EtherscanProviderTokenId[] | string = await this.provider.fetch({
			module: 'account',
			params
		});

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(({ TokenId }: EtherscanProviderTokenId) => parseNftId(TokenId));
	};
}

const providers: Record<NetworkId, EtherscanProvider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, EtherscanProvider>>((acc, { id, name, chainId }) => {
	const network = new Network(name, chainId);

	return { ...acc, [id]: new EtherscanProvider(network, chainId) };
}, {});

export const etherscanProviders = (networkId: NetworkId): EtherscanProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_etherscan_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
