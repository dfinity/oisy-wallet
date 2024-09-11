import type { NullableBalance } from '$lib/types/balance';
import type { Network } from '$lib/types/network';
import type { OptionalNullable, RequiredExcept } from '$lib/types/utils';

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

export type OptionToken = OptionalNullable<Token>;
export type OptionTokenId = OptionalNullable<TokenId>;
export type OptionTokenStandard = OptionalNullable<TokenStandard>;

export type TokenToPin = Pick<Token, 'id'> & { network: Pick<Token['network'], 'id'> };

interface TokenFinancialData {
	balance?: NullableBalance;
	usdBalance?: number;
}

export type TokenUi = Token & TokenFinancialData;

export type TokenIndexKey = string;
