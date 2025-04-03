import {
	ETHEREUM_NETWORK_ID,
	ETHERSCAN_API_URL_HOMESTEAD,
	ETHERSCAN_API_URL_SEPOLIA,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ETHERSCAN_API_KEY } from '$env/rest/etherscan.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { EtherscanRestTransaction } from '$eth/types/etherscan-transaction';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

export class EtherscanRest {
	constructor(private readonly apiUrl: string) {}

	transactions = async ({
		address,
		contract: { address: contractAddress }
	}: {
		address: EthAddress;
		contract: Erc20Token;
	}): Promise<Transaction[]> => {
		const url = new URL(this.apiUrl);
		url.searchParams.set('module', 'account');
		url.searchParams.set('action', 'tokentx');
		url.searchParams.set('contractaddress', contractAddress);
		url.searchParams.set('address', address);
		url.searchParams.set('startblock', '0');
		url.searchParams.set('endblock', '99999999');
		url.searchParams.set('sort', 'desc');
		url.searchParams.set('apikey', ETHERSCAN_API_KEY);

		// https://docs.etherscan.io/v/sepolia-etherscan
		// https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Fetching transactions with Etherscan API failed.`);
		}

		const { result }: { result: EtherscanRestTransaction[] | string } = await response.json();

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(
			({
				nonce,
				gas,
				gasPrice,
				hash,
				blockNumber,
				timeStamp,
				from,
				to,
				value
			}: EtherscanRestTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: parseInt(nonce),
				gasLimit: BigNumber.from(gas),
				gasPrice: BigNumber.from(gasPrice),
				value: BigInt(value),
				// Chain ID is not delivered by the Etherscan API so, we naively set 0
				chainId: 0
			})
		);
	};
}

const providers: Record<NetworkId, EtherscanRest> = {
	[ETHEREUM_NETWORK_ID]: new EtherscanRest(ETHERSCAN_API_URL_HOMESTEAD),
	[SEPOLIA_NETWORK_ID]: new EtherscanRest(ETHERSCAN_API_URL_SEPOLIA)
};

export const etherscanRests = (networkId: NetworkId): EtherscanRest => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_etherscan_rest_api, {
			$network: networkId.toString()
		})
	);

	return provider;
};
