import {
	ETHEREUM_NETWORK_ID,
	ETHERSCAN_NETWORK_HOMESTEAD,
	ETHERSCAN_NETWORK_SEPOLIA,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ETHERSCAN_API_KEY } from '$env/rest/etherscan.env';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import {
	EtherscanProvider as EtherscanProviderLib,
	type BlockTag,
	type Networkish,
	type TransactionResponse
} from 'ethers';
import { get } from 'svelte/store';

export class EtherscanProvider {
	private readonly provider: EtherscanProviderLib;

	constructor(private readonly network: Networkish) {
		this.provider = new EtherscanProviderLib(this.network, ETHERSCAN_API_KEY);
	}

	// https://github.com/ethers-io/ethers.js/issues/4303
	// https://ethereum.stackexchange.com/questions/147756/read-transaction-history-with-ethers-v6-1-0/150836#150836
	// eslint-disable-next-line local-rules/prefer-object-params
	private async getHistory(
		address: string,
		startBlock?: BlockTag,
		endBlock?: BlockTag
	): Promise<Array<TransactionResponse>> {
		const params = {
			action: 'txlist',
			address,
			startblock: startBlock ?? 0,
			endblock: endBlock ?? 99999999,
			sort: 'asc'
		};

		return await this.provider.fetch('account', params);
	}

	transactions = ({
		address,
		startBlock
	}: {
		address: EthAddress;
		startBlock?: BlockTag;
	}): Promise<TransactionResponse[]> => this.getHistory(address, startBlock);
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
