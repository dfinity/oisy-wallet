export type TokenId = symbol;

export type TokenNetwork = 'ethereum' | 'icp';

export type TokenStandard = 'ethereum' | 'erc20' | 'icp';

export type Token = {
	id: TokenId;
	network: TokenNetwork;
	standard: TokenStandard;
} & TokenMetadata;

export interface TokenMetadata {
	name: string;
	symbol: string;
	decimals: number;
	icon?: string;
}
