import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { EthAddress } from '$lib/types/address';
import type { ContractTransaction } from 'ethers/contract';

export interface PopulateTransactionParams {
	contract: Erc20ContractAddress;
	to: EthAddress;
}

export type CkEthPopulateTransaction = (
	params: PopulateTransactionParams
) => Promise<ContractTransaction>;

export type Erc20PopulateTransaction = (
	params: PopulateTransactionParams & {
		amount: bigint;
	}
) => Promise<ContractTransaction>;

export interface Erc20Provider {
	populateTransaction: Erc20PopulateTransaction;

	getFeeData(params: {
		contract: Erc20ContractAddress;
		from: EthAddress;
		to: EthAddress;
		amount: bigint;
	}): Promise<bigint>;
}
