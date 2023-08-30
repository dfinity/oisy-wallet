import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { Erc20Token } from '$lib/types/erc20';
import type { EtherscanRestTransaction } from '$lib/types/etherscan';
import type { Transaction } from '$lib/types/transaction';
import { BigNumber } from '@ethersproject/bignumber';

const API_URL = import.meta.env.VITE_ETHERSCAN_API_URL;
const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

export const transactions = async ({
	address,
	contract: { address: contractAddress }
}: {
	address: ECDSA_PUBLIC_KEY;
	contract: Erc20Token;
}): Promise<Omit<Transaction, 'data' | 'value'>[]> => {
	const url = new URL(API_URL);
	url.searchParams.set('module', 'account');
	url.searchParams.set('action', 'tokentx');
	url.searchParams.set('contractaddress', contractAddress);
	url.searchParams.set('address', address);
	url.searchParams.set('startblock', '0');
	url.searchParams.set('endblock', '99999999');
	url.searchParams.set('sort', 'desc');
	url.searchParams.set('apikey', API_KEY);

	// https://docs.etherscan.io/v/sepolia-etherscan
	// https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Fetching transactions with Etherscan API failed.`);
	}

	const { result }: { result: EtherscanRestTransaction[] } = await response.json();
	return result.map(
		({
			nonce,
			gas,
			gasPrice,
			hash,
			blockNumber,
			blockHash,
			timeStamp,
			confirmations,
			from,
			to,
			value
		}) => ({
			hash,
			blockNumber: parseInt(blockNumber),
			blockHash,
			timestamp: parseInt(timeStamp),
			confirmations,
			from,
			to,
			nonce: parseInt(nonce),
			gasLimit: BigNumber.from(gas),
			gasPrice: BigNumber.from(gasPrice),
			value,
			// Chain ID is not delivered by the Etherscan API so, we naively set 0
			chainId: 0
		})
	);
};
