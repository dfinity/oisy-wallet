import type { Network } from '$lib/types/network';

export type TokenId = symbol;

export type TokenStandard = 'ethereum' | 'erc20' | 'icp' | 'icrc' | 'bitcoin';

export type Token = {
	id: TokenId;
	network: Network;
	standard: TokenStandard;
} & TokenMetadata;

export interface TokenMetadata {
	name: string;
	symbol: string;
	decimals: number;
	icon?: string;
}

export type RequiredToken = Required<Token>;