import { ERC20_ABI } from '$lib/constants/erc20.constants';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { Erc20ContractAddress, Erc20Metadata } from '$lib/types/erc20';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';
import { InfuraProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const NETWORK = import.meta.env.VITE_INFURA_NETWORK;

const provider = new InfuraProvider(NETWORK, API_KEY);

export const metadata = async ({ address }: Erc20ContractAddress): Promise<Erc20Metadata> => {
	const erc20Contract = new ethers.Contract(address, ERC20_ABI, provider);

	const [name, symbol, decimals] = await Promise.all([
		erc20Contract.name(),
		erc20Contract.symbol(),
		erc20Contract.decimals()
	]);

	return {
		name,
		symbol,
		decimals
	};
};

export const balance = async ({
	contract: { address: contractAddress },
	address
}: {
	contract: Erc20ContractAddress;
	address: ECDSA_PUBLIC_KEY;
}): Promise<BigNumber> => {
	const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

	return erc20Contract.balanceOf(address);
};

export const getFeeData = async ({
	contract: { address: contractAddress },
	address,
	amount
}: {
	contract: Erc20ContractAddress;
	address: ECDSA_PUBLIC_KEY;
	amount: BigNumber;
}): Promise<BigNumber> => {
	const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
	return erc20Contract.estimateGas.approve(address, amount);
};

// Transaction send: https://ethereum.stackexchange.com/a/131944

export const populateTransaction = async ({
	contract: { address: contractAddress },
	address,
	amount
}: {
	contract: Erc20ContractAddress;
	address: ECDSA_PUBLIC_KEY;
	amount: BigNumber;
}): Promise<PopulatedTransaction> => {
	const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
	return erc20Contract.populateTransaction.transfer(address, amount);
};
