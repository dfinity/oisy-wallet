import type { Exchange } from '$lib/types/exchange';
import type { Token, TokenMetadata } from '$lib/types/token';
import type { BaseContract } from 'ethers';

export type Erc20Token = Erc20Contract & Token;

export type Erc20ContractAddress = Pick<BaseContract, 'address'>;
export type Erc20Contract = Erc20ContractAddress & { exchange: Exchange };

export type Erc20Metadata = TokenMetadata;
