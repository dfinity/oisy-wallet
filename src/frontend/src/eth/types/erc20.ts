import type { ContractAddress } from '$eth/types/address';
import type { Exchange } from '$lib/types/exchange';
import type { Token, TokenMetadata } from '$lib/types/token';

export type Erc20Token = Erc20Contract & Token;

export type RequiredErc20Token = Required<Erc20Token>;

export type Erc20ContractAddress = ContractAddress;
export type Erc20Contract = Erc20ContractAddress & { exchange: Exchange; twinTokenSymbol?: string };

export type Erc20Metadata = TokenMetadata;
