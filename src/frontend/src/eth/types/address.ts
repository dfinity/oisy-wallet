import type { BaseContract } from 'ethers/contract';

export type Erc20ContractAddress = Awaited<ReturnType<BaseContract['getAddress']>>;

export interface ContractAddress {
	address: Erc20ContractAddress;
}
