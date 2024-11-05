import type { OptionBalance } from '$lib/types/balance';
import type { Option, RequiredExcept } from '$lib/types/utils';
import {
	TokenAppearanceSchema,
	TokenBuySchema,
	TokenBuyableSchema,
	TokenCategorySchema,
	TokenMetadataSchema,
	TokenSchema,
	TokenStandardSchema,
	type TokenIdSchema
} from '$lib/validation/token.validation';
import { z } from 'zod';

export type TokenId = z.infer<typeof TokenIdSchema>;

export type TokenStandard = z.infer<typeof TokenStandardSchema>;

export type TokenCategory = z.infer<typeof TokenCategorySchema>;

export type Token = z.infer<typeof TokenSchema>;

export type TokenMetadata = z.infer<typeof TokenMetadataSchema>;

export type TokenAppearance = z.infer<typeof TokenAppearanceSchema>;

export type TokenBuyable = z.infer<typeof TokenBuyableSchema>;

export type TokenBuy = z.infer<typeof TokenBuySchema>;

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
