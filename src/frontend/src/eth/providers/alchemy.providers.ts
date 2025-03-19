import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.env';
import { ALCHEMY_NETWORK_MAINNET, ALCHEMY_NETWORK_SEPOLIA } from '$env/networks/networks.eth.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { WebSocketListener } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import type { Listener, TransactionResponse } from '@ethersproject/abstract-provider';
import {
	AlchemyProvider as AlchemyProviderLib,
	AlchemyWebSocketProvider
} from '@ethersproject/providers';
import {
	AlchemySubscription,
	type AlchemyMinedTransactionsAddress,
	type AlchemyMinedTransactionsEventFilter,
	type AlchemyPendingTransactionsEventFilter,
	type Network
} from 'alchemy-sdk';
import { get } from 'svelte/store';

interface AlchemySettings {
	apiKey: string;
	network: Network;
}

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

const alchemyConfig = (networkId: NetworkId): AlchemySettings => {
	const provider = configs[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_alchemy_config, {
			$network: networkId.toString()
		})
	);

	return provider;
};

const serializeBooleanField = (field: boolean | undefined): string | undefined => {
	if (field === undefined) {
		return '*';
	}
	return field.toString();
};

const serializeAddressField = (field: string | Array<string> | undefined): string => {
	if (field === undefined) {
		return '*';
	}
	if (Array.isArray(field)) {
		return field.join('|');
	}
	return field;
};

const serializeAddressesField = (
	addresses: AlchemyMinedTransactionsAddress[] | undefined
): string => {
	if (addresses === undefined) {
		return '*';
	}

	return addresses
		.map((filter) => `${serializeAddressField(filter.to)},${serializeAddressField(filter.from)}`)
		.join('|');
};

const serializeMinedTransactionsEvent = (event: AlchemyMinedTransactionsEventFilter): string => {
	const addresses = serializeAddressesField(event.addresses);
	const includeRemoved = serializeBooleanField(event.includeRemoved);
	const hashesOnly = serializeBooleanField(event.hashesOnly);
	return `alchemy-mined-transactions` + `:${addresses}:${includeRemoved}:${hashesOnly}`;
};

const serializePendingTransactionsEvent = (
	event: AlchemyPendingTransactionsEventFilter
): string => {
	const fromAddress = serializeAddressField(event.fromAddress);
	const toAddress = serializeAddressField(event.toAddress);
	const hashesOnly = serializeBooleanField(event.hashesOnly);
	return `alchemy-pending-transactions` + `:${fromAddress}:${toAddress}:${hashesOnly}`;
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
	const { apiKey, network } = alchemyConfig(networkId);

	let provider: AlchemyWebSocketProvider | null = new AlchemyWebSocketProvider(network, apiKey);

	provider.on(
		serializeMinedTransactionsEvent({
			method: AlchemySubscription.MINED_TRANSACTIONS,
			hashesOnly: true,
			addresses: nonNullish(toAddress) ? [{ to: toAddress }] : undefined
		}),
		listener
	);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			provider?.removeAllListeners();
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
	const { apiKey, network } = alchemyConfig(networkId);

	let provider: AlchemyWebSocketProvider | null = new AlchemyWebSocketProvider(network, apiKey);

	provider.on(
		serializePendingTransactionsEvent({
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			toAddress: toAddress,
			hashesOnly
		}),
		listener
	);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			// Alchemy is buggy. Despite successfully removing all listeners, attaching new similar events would have for effect to double the triggers. That's why we reset it to null.
			provider?.removeAllListeners();
			provider = null;
		}
	};
};

export class AlchemyProvider {
	private readonly provider: AlchemyProviderLib;

	constructor(private readonly network: Network) {
		this.provider = new AlchemyProviderLib(this.network, ALCHEMY_API_KEY);
	}

	getTransaction = (hash: string): Promise<TransactionResponse | null> =>
		this.provider.getTransaction(hash);
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
