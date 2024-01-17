import { CKETH_ABI } from '$eth/constants/cketh.constants';
import type { CkEthPopulateTransaction } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';
import { InfuraProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const NETWORK = import.meta.env.VITE_INFURA_NETWORK;

const provider = new InfuraProvider(NETWORK, API_KEY);

export const getFeeData = async ({
	contract: { address: contractAddress },
	address
}: {
	contract: Erc20ContractAddress;
	address: ETH_ADDRESS;
}): Promise<BigNumber> => {
	const ckEthContract = new ethers.Contract(contractAddress, CKETH_ABI, provider);
	return ckEthContract.estimateGas.deposit(address);
};

export const populateDepositTransaction: CkEthPopulateTransaction = async ({
	contract: { address: contractAddress },
	to
}: {
	contract: Erc20ContractAddress;
	to: ETH_ADDRESS;
}): Promise<PopulatedTransaction> => {
	console.log(contractAddress, to);

	const erc20Contract = new ethers.Contract(contractAddress, CKETH_ABI, provider);
	return erc20Contract.populateTransaction.deposit(to);
};
