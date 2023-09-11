export type TokenId = symbol;

export type Token = {
	id: TokenId;
} & TokenMetadata;

export interface TokenMetadata {
	name: string;
	symbol: string;
	decimals: number;
	icon?: string;
}
