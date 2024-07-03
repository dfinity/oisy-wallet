import type { BaseContract } from 'ethers';

export type ContractAddress = Pick<BaseContract, 'address'>;

export type ContractAddressText = typeof BaseContract.prototype.address;
