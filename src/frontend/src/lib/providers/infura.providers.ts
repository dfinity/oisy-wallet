import type { ETH_ADDRESS } from '$lib/types/address';
import type { BigNumber } from '@ethersproject/bignumber';
import { InfuraProvider, type FeeData, type TransactionResponse } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const NETWORK = import.meta.env.VITE_INFURA_NETWORK;

const provider = new InfuraProvider(NETWORK, API_KEY);

export const balance = (address: ETH_ADDRESS): Promise<BigNumber> => provider.getBalance(address);

export const getFeeData = (): Promise<FeeData> => provider.getFeeData();

export const sendTransaction = (signedTransaction: string): Promise<TransactionResponse> =>
	provider.sendTransaction(signedTransaction);

export const getTransactionCount = (address: ETH_ADDRESS): Promise<number> =>
	provider.getTransactionCount(address, 'pending');

export const getBlockNumber = (): Promise<number> => provider.getBlockNumber();

export const getCode = (address: ETH_ADDRESS): Promise<string> => provider.getCode(address);

export const getContractFeeData = async ({
	contractAddress,
	abi,
	fn
}: {
	contractAddress: ETH_ADDRESS;
	abi: string;
	fn: string;
}): Promise<BigNumber> => {
	const contract = new ethers.Contract(contractAddress, abi, provider);
	// TODO: how do we pass the parameters?!!?!?!?
	return contract.estimateGas[fn]();
};
