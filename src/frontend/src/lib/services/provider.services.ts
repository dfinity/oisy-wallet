import type { ECDSA_PUBLIC_KEY } from '$lib/types/eth';
import type { BigNumber } from '@ethersproject/bignumber';
import { EtherscanProvider, type TransactionResponse } from '@ethersproject/providers';

// TODO: migration to ethers v6 issue https://github.com/ethers-io/ethers.js/issues/4303

export const balance = (address: ECDSA_PUBLIC_KEY): Promise<BigNumber> => {
	// TODO: api key as second parameter
	const provider = new EtherscanProvider('sepolia');
	return provider.getBalance(address);
};

export const transactions = (address: ECDSA_PUBLIC_KEY): Promise<TransactionResponse[]> => {
	// TODO: api key as second parameter
	const provider = new EtherscanProvider('sepolia');
	return provider.getHistory(address);
};
