import {
	ALCHEMY_NETWORK_MAINNET,
	ALCHEMY_NETWORK_SEPOLIA,
	ETHEREUM_NETWORK_ID,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { ZERO_BI } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { WebSocketListener } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { Alchemy, AlchemySubscription, type AlchemySettings, type Network } from 'alchemy-sdk';
import type { Listener } from 'ethers/utils';
import { get } from 'svelte/store';

const configs: Record<NetworkId, AlchemySettings> = {
	[ETHEREUM_NETWORK_ID]: {
		apiKey: ALCHEMY_API_KEY,
		network: ALCHEMY_NETWORK_MAINNET
	},
	[SEPOLIA_NETWORK_ID]: {
		apiKey: ALCHEMY_API_KEY,
		network: ALCHEMY_NETWORK_SEPOLIA
	}
};

const alchemyConfig = (networkId: NetworkId): Pick<AlchemySettings, 'apiKey' | 'network'> => {
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

	provider.ws.on(
		{
			method: AlchemySubscription.MINED_TRANSACTIONS,
			hashesOnly: true,
			addresses: nonNullish(toAddress) ? [{ to: toAddress }] : undefined
		},
		listener
	);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
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

	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			toAddress: toAddress,
			hashesOnly
		},
		listener
	);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			// Alchemy is buggy. Despite successfully removing all listeners, attaching new similar events would have for effect to double the triggers. That's why we reset it to null.
			provider?.ws.removeAllListeners();
			provider = null;
		}
	};
};

export class AlchemyProvider {
	private readonly provider: Alchemy;

	constructor(private readonly network: Network) {
		this.provider = new Alchemy({
			apiKey: ALCHEMY_API_KEY,
			network: this.network
		});
	}

	getTransaction = async (hash: string) => {
		const transaction = await this.provider.core.getTransaction(hash);

		if (isNullish(transaction)) {
			return transaction;
		}

		const {
			blockNumber,
			blockHash,
			from,
			to,
			value,
			type,
			gasPrice,
			gasLimit,
			maxPriorityFeePerGas,
			maxFeePerGas,
			nonce,
			data,
			chainId,
			confirmations,
			timestamp
		} = transaction;

		const possibleUndefinedToNull = <T>(value: T | undefined): T | null => value ?? null;

		return {
			hash,
			blockNumber: possibleUndefinedToNull(blockNumber),
			blockHash: possibleUndefinedToNull(blockHash),
			from,
			to: possibleUndefinedToNull(to),
			value: value.toBigInt(),
			type: possibleUndefinedToNull(type),
			gasPrice: gasPrice?.toBigInt() ?? ZERO_BI,
			gasLimit: gasLimit.toBigInt(),
			maxPriorityFeePerGas: possibleUndefinedToNull(maxPriorityFeePerGas?.toBigInt()),
			maxFeePerGas: possibleUndefinedToNull(maxFeePerGas?.toBigInt()),
			nonce,
			data,
			chainId: BigInt(chainId),
			confirmations: () => Promise.resolve(confirmations)
		};
	};
}

const providers: Record<NetworkId, AlchemyProvider> = {
	[ETHEREUM_NETWORK_ID]: new AlchemyProvider(ALCHEMY_NETWORK_MAINNET),
	[SEPOLIA_NETWORK_ID]: new AlchemyProvider(ALCHEMY_NETWORK_SEPOLIA)
};

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
