import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { Exchange } from '$lib/types/exchange';
import type { RequiredToken, Token } from '$lib/types/token';

export type Erc20Token = Erc20Contract & Token;

export type RequiredEvmErc20Token = RequiredToken<Erc20Token>;

export type Erc20Contract = Erc20ContractAddress & { exchange: Exchange };
