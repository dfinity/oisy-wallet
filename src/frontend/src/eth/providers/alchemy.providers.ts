import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.env';
import { ALCHEMY_NETWORK_MAINNET, ALCHEMY_NETWORK_SEPOLIA } from '$env/networks/networks.eth.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import type { WebSocketListener } from '$eth/types/listener';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import type { Listener, TransactionResponse } from '@ethersproject/abstract-provider';
import { Alchemy, AlchemySubscription, type AlchemySettings, type Network } from 'alchemy-sdk';
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

	getTransaction = (hash: string): Promise<TransactionResponse | null> =>
		this.provider.core.getTransaction(hash);
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
