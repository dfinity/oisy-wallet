import type {
	TokenAppearanceSchema,
	TokenBuySchema,
	TokenBuyableSchema,
	TokenCategorySchema,
	TokenIdSchema,
	TokenMetadataSchema,
	TokenSchema,
	TokenStandardSchema
} from '$lib/schema/token.schema';
import type { OptionBalance } from '$lib/types/balance';
import type { TokenGroup } from '$lib/types/token-group';
import type { Option, RequiredExcept } from '$lib/types/utils';
import type * as z from 'zod/v4';

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

export type NonRequiredProps = TokenAppearance & TokenBuyable & TokenGroup;

export type RequiredToken<T extends Token = Token, M extends object = {}> = RequiredExcept<
	T,
	keyof NonRequiredProps,
	M
>;

export type RequiredTokenWithLinkedData = RequiredToken<TokenWithLinkedData>;

export type OptionToken = Option<Token>;
export type OptionTokenId = Option<TokenId>;
export type OptionTokenStandard = Option<TokenStandard>;

export type TokenToPin = Pick<Token, 'id'> & { network: Pick<Token['network'], 'id'> };

export interface TokenFinancialData {
	balance?: Exclude<OptionBalance, undefined>;
	usdBalance?: number;
}

export type TokenUi<T extends Token = Token> = T & TokenFinancialData;

export type TokenUiGroupable<T extends Token = Token> = Omit<TokenUi<T>, 'groupData'> &
	Required<Pick<TokenUi<T>, 'groupData'>>;

export type OptionTokenUi = Option<TokenUi>;
