import type { ECDSA_PUBLIC_KEY } from '$lib/types/eth';
import type { BigNumber } from '@ethersproject/bignumber';
import {
	EtherscanProvider,
	type FeeData,
	type TransactionResponse
} from '@ethersproject/providers';

// TODO: migration to ethers v6 issue https://github.com/ethers-io/ethers.js/issues/4303

const API_KEY = import.meta.env.VITE_EHTERSCAN_API_KEY;
const provider = new EtherscanProvider('sepolia', API_KEY);

export const balance = (address: ECDSA_PUBLIC_KEY): Promise<BigNumber> =>
	provider.getBalance(address);

export const transactions = (address: ECDSA_PUBLIC_KEY): Promise<TransactionResponse[]> =>
	provider.getHistory(address);

export const getFeeData = (): Promise<FeeData> => provider.getFeeData();

export const sendTransaction = (signedTransaction: string): Promise<TransactionResponse> =>
	provider.sendTransaction(signedTransaction);
