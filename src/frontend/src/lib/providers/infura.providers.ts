import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { BigNumber } from '@ethersproject/bignumber';
import { InfuraProvider, type FeeData, type TransactionResponse } from '@ethersproject/providers';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const NETWORK = import.meta.env.VITE_INFURA_NETWORK;

const provider = new InfuraProvider(NETWORK, API_KEY);

export const balance = (address: ECDSA_PUBLIC_KEY): Promise<BigNumber> =>
	provider.getBalance(address);

export const getFeeData = (): Promise<FeeData> => provider.getFeeData();

export const sendTransaction = (signedTransaction: string): Promise<TransactionResponse> =>
	provider.sendTransaction(signedTransaction);

export const getTransactionCount = (address: ECDSA_PUBLIC_KEY): Promise<number> =>
	provider.getTransactionCount(address, 'pending');

export const getBlockNumber = (): Promise<number> => provider.getBlockNumber();
