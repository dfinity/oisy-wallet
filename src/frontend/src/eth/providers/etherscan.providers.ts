import {
	ETHEREUM_NETWORK_ID,
	ETHERSCAN_NETWORK_HOMESTEAD,
	ETHERSCAN_NETWORK_SEPOLIA,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ETHERSCAN_API_KEY } from '$env/rest/etherscan.env';
import type {
	EtherscanProviderInternalTransaction,
	EtherscanProviderTransaction
} from '$eth/types/etherscan-transaction';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import {
	EtherscanProvider as EtherscanProviderLib,
	type BlockTag,
	type Networkish
} from 'ethers/providers';
import { get } from 'svelte/store';

type TransactionsParams = {
	address: EthAddress;
	startBlock?: BlockTag;
	endBlock?: BlockTag;
};

export class EtherscanProvider {
	private readonly provider: EtherscanProviderLib;

	constructor(private readonly network: Networkish) {
		this.provider = new EtherscanProviderLib(this.network, ETHERSCAN_API_KEY);
	}

	// There is no `getHistory` in ethers v6
	// Issue report: https://github.com/ethers-io/ethers.js/issues/4303
	// Workaround: https://ethereum.stackexchange.com/questions/147756/read-transaction-history-with-ethers-v6-1-0/150836#150836
	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
	private async getHistory({
		address,
		startBlock,
		endBlock
	}: TransactionsParams): Promise<Transaction[]> {
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
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				value: BigInt(value),
				// Chain ID is not delivered by the Etherscan API so, we naively set 0
				chainId: 0n
			})
		);
	}

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-internal-transactions-by-address
	private async getInternalHistory({
		address,
		startBlock,
		endBlock
	}: TransactionsParams): Promise<Transaction[]> {
		const params = {
			action: 'txlistinternal',
			address,
			startblock: startBlock ?? 0,
			endblock: endBlock ?? 99999999,
			sort: 'asc'
		};

		const result: EtherscanProviderInternalTransaction[] = await this.provider.fetch(
			'account',
			params
		);

		return result.map(
			({
				blockNumber,
				timeStamp,
				hash,
				from,
				to,
				value,
				gas
			}: EtherscanProviderInternalTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: 0,
				gasLimit: BigInt(gas),
				value: BigInt(value),
				// Chain ID is not delivered by the Etherscan API so, we naively set 0
				chainId: 0n
			})
		);
	}

	transactions = async (params: TransactionsParams): Promise<Transaction[]> => {
		const results = await Promise.all([this.getHistory(params), this.getInternalHistory(params)]);

		return results.flat();
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
