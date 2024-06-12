import type { Network, NetworkEnvironment } from '$lib/types/network';

export type TokenId = symbol;

export type TokenStandard = 'ethereum' | 'erc20' | 'icp' | 'icrc' | 'bitcoin';

export type TokenCategory = 'default' | 'custom';

export type Token = {
	id: TokenId;
	network: Network;
	standard: TokenStandard;
	category: TokenCategory;
	overrideNetworkEnv?: NetworkEnvironment;
} & TokenMetadata;

export interface TokenMetadata {
	name: string;
	symbol: string;
	decimals: number;
	icon?: string;
}

export type RequiredToken = Required<Token>;
