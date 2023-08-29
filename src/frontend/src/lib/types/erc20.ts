import type { Token, TokenMetadata } from '$lib/types/token';
import type { BaseContract } from '@ethersproject/contracts/src.ts';

export type Erc20Token = Erc20ContractAddress & Token;

export type Erc20ContractAddress = Pick<BaseContract, 'address'>;

export type Erc20Metadata = TokenMetadata;
