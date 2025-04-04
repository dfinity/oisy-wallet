import {
	ETHEREUM_NETWORK_ID,
	ETHERSCAN_NETWORK_HOMESTEAD,
	ETHERSCAN_NETWORK_SEPOLIA,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ETHERSCAN_API_KEY } from '$env/rest/etherscan.env';
import type { EtherscanProviderTransaction } from '$eth/types/etherscan-transaction';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { BlockTag } from '@ethersproject/abstract-provider';
import type { Networkish } from '@ethersproject/networks';
import { EtherscanProvider as EtherscanProviderLib } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { get } from 'svelte/store';

export class EtherscanProvider {
	private readonly provider: EtherscanProviderLib;

	constructor(private readonly network: Networkish) {
		this.provider = new EtherscanProviderLib(this.network, ETHERSCAN_API_KEY);
	}

	// https://github.com/ethers-io/ethers.js/issues/4303
	// https://ethereum.stackexchange.com/questions/147756/read-transaction-history-with-ethers-v6-1-0/150836#150836
	private async getHistory({
		address,
		startBlock,
		endBlock
	}: {
		address: string;
		startBlock?: BlockTag;
		endBlock?: BlockTag;
	}): Promise<Transaction[]> {
		const params = {
			action: 'txlist',
			address,
			startblock: startBlock ?? 0,
			endblock: endBlock ?? 99999999,
			sort: 'asc'
		};

		const result: EtherscanProviderTransaction[] = await this.provider.fetch('account', params);

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
				gasPrice
			}: EtherscanProviderTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: parseInt(nonce),
				gasLimit: BigNumber.from(gas).toBigInt(),
				gasPrice: BigNumber.from(gasPrice).toBigInt(),
				value: BigInt(value),
				// Chain ID is not delivered by the Etherscan API so, we naively set 0
				chainId: 0n
			})
		);
	}

	transactions = ({
		address,
		startBlock
	}: {
		address: EthAddress;
		startBlock?: BlockTag;
	}): Promise<Transaction[]> => this.getHistory({ address, startBlock });
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
