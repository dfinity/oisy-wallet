import { ICP_ERC20_ABI } from '$lib/constants/icp-erc20.constants';
import type { ECDSA_PUBLIC_KEY, ETH_ADDRESS } from '$lib/types/address';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import type { Erc20PopulateTransaction } from '$lib/types/erc20-providers';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';
import { InfuraProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const NETWORK = import.meta.env.VITE_INFURA_NETWORK;

const provider = new InfuraProvider(NETWORK, API_KEY);

export const getFeeData = async ({
	contract: { address: contractAddress },
	address,
	amount
}: {
	contract: Erc20ContractAddress;
	address: ECDSA_PUBLIC_KEY;
	amount: BigNumber;
}): Promise<BigNumber> => {
	const erc20Contract = new ethers.Contract(contractAddress, ICP_ERC20_ABI, provider);
	return erc20Contract.estimateGas.burnToAccountId(amount, address);
};

export const populateBurnTransaction: Erc20PopulateTransaction = async ({
	contract: { address: contractAddress },
	to,
	amount
}: {
	contract: Erc20ContractAddress;
	to: ETH_ADDRESS;
	amount: BigNumber;
}): Promise<PopulatedTransaction> => {
	const erc20Contract = new ethers.Contract(contractAddress, ICP_ERC20_ABI, provider);
	return erc20Contract.populateTransaction.burnToAccountId(amount, to);
};
