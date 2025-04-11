import type { Erc20Contract } from '$eth/types/erc20';
import type { RequiredToken, Token } from '$lib/types/token';

export type EvmErc20Token = Omit<Erc20Contract, 'twinTokenSymbol'> & Token & { twinToken?: Token };

export type RequiredEvmErc20Token = RequiredToken<EvmErc20Token>;
