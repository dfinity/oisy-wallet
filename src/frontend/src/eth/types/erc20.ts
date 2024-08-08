import type { ContractAddress } from '$eth/types/address';
import type { Exchange } from '$lib/types/exchange';
import type { Token, TokenAppearance, TokenMetadata } from '$lib/types/token';
import type { RequiredExcept } from '$lib/types/utils';

export type Erc20Token = Erc20Contract & Token;

export type RequiredErc20Token = RequiredExcept<Erc20Token, keyof TokenAppearance>;

export type Erc20ContractAddress = ContractAddress;
export type Erc20Contract = Erc20ContractAddress & { exchange: Exchange; twinTokenSymbol?: string };

export type Erc20Metadata = TokenMetadata;

export type OptionErc20Token = Erc20Token | undefined | null;
