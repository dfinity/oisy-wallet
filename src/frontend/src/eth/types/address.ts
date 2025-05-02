import type { BaseContract } from 'ethers/contract';

export interface ContractAddress {
	address: Awaited<ReturnType<BaseContract['getAddress']>>;
}
