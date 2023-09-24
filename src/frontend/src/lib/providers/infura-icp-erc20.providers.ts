import { ICP_ERC20_ABI } from '$lib/constants/icp-erc20.constants';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import type { ICP_ACCOUNT_IDENTIFIER } from '$lib/types/icp';
import type { BigNumber } from '@ethersproject/bignumber';
import { InfuraProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const NETWORK = import.meta.env.VITE_INFURA_NETWORK;

const provider = new InfuraProvider(NETWORK, API_KEY);

export const burnToICP = async ({
	contract: { address: contractAddress },
	to,
	amount
}: {
	contract: Erc20ContractAddress;
	amount: BigNumber;
	to: ICP_ACCOUNT_IDENTIFIER;
}): Promise<BigNumber> => {
	const erc20Contract = new ethers.Contract(contractAddress, ICP_ERC20_ABI, provider);
	return erc20Contract.burnToAccountId(amount, `0x${to}`);
};
