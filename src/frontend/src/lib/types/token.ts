import type { OptionBalance } from '$lib/types/balance';
import type { Network } from '$lib/types/network';
import type { Option, RequiredExcept } from '$lib/types/utils';

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

export interface TokenLinkedData {
	twinTokenSymbol?: string;
}

export type TokenWithLinkedData = Token & TokenLinkedData;

export type RequiredToken<T extends Token = Token> = RequiredExcept<T, keyof TokenAppearance>;

export type OptionToken = Option<Token>;
export type OptionTokenId = Option<TokenId>;
export type OptionTokenStandard = Option<TokenStandard>;

export type TokenToPin = Pick<Token, 'id'> & { network: Pick<Token['network'], 'id'> };

interface TokenFinancialData {
	balance?: Exclude<OptionBalance, undefined>;
	usdBalance?: number;
}

export type TokenUi = Token & TokenFinancialData;

export type TokenIndexKey = string;
