import type { BaseContract } from '@ethersproject/contracts/src.ts';

export type Erc20Contract = Erc20ContractAddress & Erc20Metadata;

export type Erc20ContractAddress = Pick<BaseContract, 'address'>;

export interface Erc20Metadata {
    name: string;
    symbol: string;
    decimals: number;
}
