import type { Network } from '$lib/types/network';
import type { RequiredExcept } from '$lib/types/utils';

export type TokenId = symbol;

export type TokenStandard = 'ethereum' | 'erc20' | 'icp' | 'icrc' | 'bitcoin';

export type TokenCategory = 'default' | 'custom';

export type Token = {
	id: TokenId;
	network: Network;
	standard: TokenStandard;
	category: TokenCategory;
} & TokenMetadata &
	TokenAppearance;

export interface TokenMetadata {
	name: string;
	symbol: string;
	decimals: number;
	icon?: string;
}

export interface TokenAppearance {
	oisyName?: TokenOisyName;
}

export type TokenOisyName = {
	prefix: string | undefined;
	oisyName: string;
};

export type RequiredToken = RequiredExcept<Token, keyof TokenAppearance>;

export type OptionToken = Token | undefined | null;
export type OptionTokenId = TokenId | undefined | null;
export type OptionTokenStandard = TokenStandard | undefined | null;

export type TokenToPin = Pick<Token, 'id'> & { network: Pick<Token['network'], 'id'> };

interface TokenFinancialData {
	usdBalance?: number;
}

export type TokenUi = Token & TokenFinancialData;

export type TokenWithBalance = TokenUi & { balance: number };
