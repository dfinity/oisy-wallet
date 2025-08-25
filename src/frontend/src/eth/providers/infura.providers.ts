import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { INFURA_NETWORK_HOMESTEAD, INFURA_NETWORK_SEPOLIA } from '$env/networks.eth.env';
import { i18n } from '$lib/stores/i18n.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import type { Networkish } from '@ethersproject/networks';
import {
	InfuraProvider as InfuraProviderLib,
	type FeeData,
	type TransactionResponse
} from '@ethersproject/providers';
import { get } from 'svelte/store';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;

export class InfuraProvider {
	private readonly provider: InfuraProviderLib;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProviderLib(this.network, API_KEY);
	}

	balance = (address: ETH_ADDRESS): Promise<BigNumber> => {
		return this.provider.getBalance(address);
	};

	getFeeData = (): Promise<FeeData> => {
		return this.provider.getFeeData();
	};

	sendTransaction = (signedTransaction: string): Promise<TransactionResponse> => {
		return this.provider.sendTransaction(signedTransaction);
	};

	getTransactionCount = (address: ETH_ADDRESS): Promise<number> => {
		return this.provider.getTransactionCount(address, 'pending');
	};

	getBlockNumber = (): Promise<number> => {
		return this.provider.getBlockNumber();
	};
}

const providers: Record<NetworkId, InfuraProvider> = {
	[ETHEREUM_NETWORK_ID]: new InfuraProvider(INFURA_NETWORK_HOMESTEAD),
	[SEPOLIA_NETWORK_ID]: new InfuraProvider(INFURA_NETWORK_SEPOLIA)
};

export const infuraProviders = (networkId: NetworkId): InfuraProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
