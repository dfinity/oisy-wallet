import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import {
	EtherscanProvider as EtherscanProviderLib,
	type BlockTag,
	type FeeData,
	type TransactionResponse
} from 'ethers';

class EtherscanProvider extends EtherscanProviderLib {
	// Re-implement and adapt ether.js v5 getHistory
	async getHistory(
		address: string,
		startBlock?: BlockTag,
		endBlock?: BlockTag
	): Promise<Array<TransactionResponse>> {
		const params = {
			action: 'txlist',
			address,
			startblock: startBlock == null ? 0 : startBlock,
			endblock: endBlock == null ? 99999999 : endBlock,
			sort: 'asc'
		};

		return this.fetch('account', params);
	}
}

const API_KEY = import.meta.env.VITE_EHTERSCAN_API_KEY;
const provider = new EtherscanProvider('sepolia', API_KEY);

export const balance = (address: ECDSA_PUBLIC_KEY): Promise<bigint> => provider.getBalance(address);

export const transactions = (address: ECDSA_PUBLIC_KEY): Promise<TransactionResponse[]> =>
	provider.getHistory(address);

export const getFeeData = (): Promise<FeeData> => provider.getFeeData();

export const sendTransaction = (signedTransaction: string): Promise<TransactionResponse> =>
	provider.broadcastTransaction(signedTransaction);
