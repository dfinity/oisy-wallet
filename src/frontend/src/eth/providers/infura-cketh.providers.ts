import { CKETH_ABI } from '$eth/constants/cketh.constants';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { BigNumber } from '@ethersproject/bignumber';
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
	address: Uint8Array;
}): Promise<BigNumber> => {
	const ckEthContract = new ethers.Contract(contractAddress, CKETH_ABI, provider);
	return ckEthContract.estimateGas.deposit(address);
};
