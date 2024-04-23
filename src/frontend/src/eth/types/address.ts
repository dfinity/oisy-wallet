import type { BaseContract } from 'ethers';

export type ContractAddress = Pick<BaseContract, 'address'>;
