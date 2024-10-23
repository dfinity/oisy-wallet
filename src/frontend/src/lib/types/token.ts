import type { OptionBalance } from '$lib/types/balance';
import type { Network } from '$lib/types/network';
import type { OnramperId } from '$lib/types/onramper';
import type { AtLeastOne, Option, RequiredExcept } from '$lib/types/utils';

export type TokenId = symbol;

export type TokenStandard = 'ethereum' | 'erc20' | 'icp' | 'icrc' | 'bitcoin';

export type TokenCategory = 'default' | 'custom';

export type Token = {
	id: TokenId;
	network: Network;
	standard: TokenStandard;
	category: TokenCategory;
} & TokenMetadata &
	TokenAppearance &
	TokenBuyable;

export interface TokenMetadata {
	name: string;
	symbol: string;
	decimals: number;
	icon?: string;
}

export interface TokenAppearance {
	oisyName?: TokenOisyName;
}

export interface TokenOisyName {
	prefix: string | undefined;
	oisyName: string;
}

export interface TokenBuyable {
	buy?: AtLeastOne<TokenBuy>;
}

export interface TokenBuy {
	onramperId?: OnramperId;
}

export interface TokenLinkedData {
	twinTokenSymbol?: string;
}

export type TokenWithLinkedData = Token & TokenLinkedData;

export type NonRequiredProps = TokenAppearance & TokenBuyable;

export type RequiredToken<T extends Token = Token> = RequiredExcept<T, keyof NonRequiredProps>;

export type RequiredTokenWithLinkedData = RequiredToken<TokenWithLinkedData>;

export type OptionToken = Option<Token>;
export type OptionTokenId = Option<TokenId>;
export type OptionTokenStandard = Option<TokenStandard>;

export type TokenToPin = Pick<Token, 'id'> & { network: Pick<Token['network'], 'id'> };

export interface TokenFinancialData {
	balance?: Exclude<OptionBalance, undefined>;
	usdBalance?: number;
}

export type TokenUi = Token & TokenFinancialData;

export type OptionTokenUi = Option<TokenUi>;

// TODO: remove header and nativeNetwork, since we added nativeToken that has all their data, and they became redundant
export interface TokenGroupUi {
	header: TokenMetadata;
	nativeToken: TokenUi;
	nativeNetwork: Network;
	tokens: TokenUi[];
}

export type TokenUiOrGroupUi = TokenUi | TokenGroupUi;
