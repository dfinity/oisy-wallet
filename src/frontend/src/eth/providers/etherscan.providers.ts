import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { ETHERSCAN_NETWORK_HOMESTEAD, ETHERSCAN_NETWORK_SEPOLIA } from '$env/networks.eth.env';
import { i18n } from '$lib/stores/i18n.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { BlockTag } from '@ethersproject/abstract-provider';
import type { Networkish } from '@ethersproject/networks';
import {
	EtherscanProvider as EtherscanProviderLib,
	type TransactionResponse
} from '@ethersproject/providers';
import { get } from 'svelte/store';

const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

export class EtherscanProvider {
	private readonly provider: EtherscanProviderLib;

	constructor(private readonly network: Networkish) {
		this.provider = new EtherscanProviderLib(this.network, API_KEY);
	}

	transactions = ({
		address,
		startBlock
	}: {
		address: ETH_ADDRESS;
		startBlock?: BlockTag;
	}): Promise<TransactionResponse[]> => {
		return this.provider.getHistory(address, startBlock);
	};
}

const providers: Record<NetworkId, EtherscanProvider> = {
	[ETHEREUM_NETWORK_ID]: new EtherscanProvider(ETHERSCAN_NETWORK_HOMESTEAD),
	[SEPOLIA_NETWORK_ID]: new EtherscanProvider(ETHERSCAN_NETWORK_SEPOLIA)
};

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
