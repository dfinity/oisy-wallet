import {
	ETHERSCAN_NETWORK_HOMESTEAD,
	ETHERSCAN_NETWORK_SEPOLIA
} from '$eth/constants/networks.constants';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$icp-eth/constants/networks.constants';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { assertNonNullish } from '@dfinity/utils';
import type { BlockTag } from '@ethersproject/abstract-provider';
import type { Networkish } from '@ethersproject/networks';
import {
	EtherscanProvider as EtherscanProviderLib,
	type TransactionResponse
} from '@ethersproject/providers';

const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

export class EtherscanProvider {
	private readonly provider: EtherscanProviderLib;

	constructor(private readonly network: Networkish) {
		this.provider = new EtherscanProviderLib(this.network, API_KEY);
	}

	transactions({
		address,
		startBlock
	}: {
		address: ETH_ADDRESS;
		startBlock?: BlockTag;
	}): Promise<TransactionResponse[]> {
		return this.provider.getHistory(address, startBlock);
	}
}

const providers: Record<NetworkId, EtherscanProvider> = {
	[ETHEREUM_NETWORK_ID]: new EtherscanProvider(ETHERSCAN_NETWORK_HOMESTEAD),
	[SEPOLIA_NETWORK_ID]: new EtherscanProvider(ETHERSCAN_NETWORK_SEPOLIA)
};

export const etherscanProviders = (networkId: NetworkId): EtherscanProvider => {
	const provider = providers[networkId];

	assertNonNullish(provider, `No Etherscan provider for network ${networkId.toString()}`);

	return provider;
};
