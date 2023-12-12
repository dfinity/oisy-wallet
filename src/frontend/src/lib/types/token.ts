export type TokenId = symbol;

export type TokenStandard = 'ethereum' | 'erc20' | 'icp';

export type Token = {
	id: TokenId;
	standard: TokenStandard;
} & TokenMetadata;

export interface TokenMetadata {
	name: string;
	symbol: string;
	decimals: number;
	icon?: string;
}
