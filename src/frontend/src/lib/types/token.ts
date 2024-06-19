import type { Network } from '$lib/types/network';

export type TokenId = symbol;

export type TokenStandard = 'ethereum' | 'erc20' | 'icp' | 'icrc' | 'bitcoin';

export type TokenCategory = 'default' | 'custom';

export type Token = {
	id: TokenId;
	network: Network;
	standard: TokenStandard;
	category: TokenCategory;
} & TokenMetadata;

export interface TokenMetadata {
	name: string;
	symbol: string;
	decimals: number;
	icon?: string;
}

export type RequiredToken = Required<Token>;

export type OptionToken = Token | undefined | null;
export type OptionTokenId = TokenId | undefined | null;
export type OptionTokenStandard = TokenStandard | undefined | null;
