import type { OptionBalance } from '$lib/types/balance';
import type { Network } from '$lib/types/network';
import type { OnramperId } from '$lib/types/onramper';
import type { AtLeastOne, Option, RequiredExcept } from '$lib/types/utils';
import { z } from 'zod';

export const TokenIdSchema = z.symbol().brand<'TokenId'>();

const TokenStandardSchema = z.enum(['ethereum', 'erc20', 'icp', 'icrc', 'bitcoin']);

const TokenCategorySchema = z.enum(['default', 'custom']);

const TokenMetadataSchema = z.object({
	name: z.string(),
	symbol: z.string(),
	decimals: z.number(),
	icon: z.string().optional()
});

const TokenOisySymbolSchema = z.object({
	oisySymbol: z.string()
});

const TokenOisyNameSchema = z.object({
	prefix: z.string().optional(),
	oisyName: z.string()
});

const TokenAppearanceSchema = z.object({
	oisySymbol: TokenOisySymbolSchema.optional(),
	oisyName: TokenOisyNameSchema.optional()
});

export type TokenId = z.infer<typeof TokenIdSchema>;

export type TokenStandard = z.infer<typeof TokenStandardSchema>;

export type TokenCategory = z.infer<typeof TokenCategorySchema>;

export type Token = {
	id: TokenId;
	network: Network;
	standard: TokenStandard;
	category: TokenCategory;
} & TokenMetadata &
	TokenAppearance &
	TokenBuyable;

export type TokenMetadata = z.infer<typeof TokenMetadataSchema>;

export type TokenAppearance = z.infer<typeof TokenAppearanceSchema>;

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
