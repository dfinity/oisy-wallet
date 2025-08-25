import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { ALCHEMY_NETWORK_MAINNET, ALCHEMY_NETWORK_SEPOLIA } from '$env/networks.eth.env';
import type { WebSocketListener } from '$eth/types/listener';
import { i18n } from '$lib/stores/i18n.store';
import type { ETH_ADDRESS, OptionAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import type { Listener, TransactionResponse } from '@ethersproject/abstract-provider';
import type { AlchemySettings, Network } from 'alchemy-sdk';
import { Alchemy, AlchemySubscription } from 'alchemy-sdk';
import { get } from 'svelte/store';

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

const configs: Record<NetworkId, AlchemySettings> = {
	[ETHEREUM_NETWORK_ID]: {
		apiKey: API_KEY,
		network: ALCHEMY_NETWORK_MAINNET
	},
	[SEPOLIA_NETWORK_ID]: {
		apiKey: API_KEY,
		network: ALCHEMY_NETWORK_SEPOLIA
	}
};

const alchemyConfig = (networkId: NetworkId): AlchemySettings => {
	const provider = configs[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).env.error.no_alchemy_config, {
			$network: networkId.toString()
		})
	);

	return provider;
};

export const initMinedTransactionsListener = ({
	listener,
	networkId
}: {
	listener: Listener;
	networkId: NetworkId;
}): WebSocketListener => {
	let provider: Alchemy | null = new Alchemy(alchemyConfig(networkId));

	provider.ws.on(
		{
			method: AlchemySubscription.MINED_TRANSACTIONS,
			hashesOnly: true
		},
		listener
	);

	return {
		disconnect: async () => {
			provider?.ws.removeAllListeners();
			provider = null;
		}
	};
};

export const initPendingTransactionsListener = ({
	toAddress,
	fromAddress,
	listener,
	networkId
}: {
	toAddress: ETH_ADDRESS;
	fromAddress?: OptionAddress;
	listener: Listener;
	networkId: NetworkId;
}): WebSocketListener => {
	let provider: Alchemy | null = new Alchemy(alchemyConfig(networkId));

	provider.ws.on(
		{
			method: AlchemySubscription.PENDING_TRANSACTIONS,
			toAddress: toAddress,
			...(nonNullish(fromAddress) && { fromAddress }),
			hashesOnly: true
		},
		listener
	);

	return {
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
			apiKey: API_KEY,
			network: this.network
		});
	}

	getTransaction = (hash: string): Promise<TransactionResponse | null> => {
		return this.provider.core.getTransaction(hash);
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
		replacePlaceholders(get(i18n).env.error.no_alchemy_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
