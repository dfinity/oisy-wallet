import type { ContractAddress } from '$eth/types/address';
import type { Exchange } from '$lib/types/exchange';
import type { RequiredToken, Token, TokenMetadata } from '$lib/types/token';
import type { Option } from '$lib/types/utils';

export type Erc20Token = Erc20Contract & Token;

export type RequiredErc20Token = RequiredToken<Erc20Token>;

export type Erc20ContractAddress = ContractAddress;
export type Erc20Contract = Erc20ContractAddress & { exchange: Exchange; twinTokenSymbol?: string };

export type Erc20Metadata = TokenMetadata;

export type OptionErc20Token = Option<Erc20Token>;
