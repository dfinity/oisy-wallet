import type { BaseContract } from 'ethers';

export interface ContractAddress {
	address: Awaited<ReturnType<BaseContract['getAddress']>>;
}

export type ContractAddressText = Awaited<ReturnType<BaseContract['getAddress']>>;
