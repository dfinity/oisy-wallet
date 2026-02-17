import type {
	TokenAppearanceSchema,
	TokenBuyableSchema,
	TokenCategorySchema,
	TokenIdSchema,
	TokenMetadataSchema,
	TokenSchema,
	TokenStandardCodeSchema,
	TokenStandardSchema
} from '$lib/schema/token.schema';
import type { OptionBalance } from '$lib/types/balance';
import type { TokenGroup } from '$lib/types/token-group';
import type { Option, RequiredExcept } from '$lib/types/utils';
import type * as z from 'zod';

export type TokenId = z.infer<typeof TokenIdSchema>;

export type TokenStandardCode = z.infer<typeof TokenStandardCodeSchema>;

export type TokenStandard = z.infer<typeof TokenStandardSchema>;

export type TokenCategory = z.infer<typeof TokenCategorySchema>;

export type Token = z.infer<typeof TokenSchema>;

export type TokenMetadata = z.infer<typeof TokenMetadataSchema>;

export type TokenAppearance = z.infer<typeof TokenAppearanceSchema>;

export type TokenBuyable = z.infer<typeof TokenBuyableSchema>;

export interface TokenLinkedData {
	twinTokenSymbol?: string;
}

export type TokenWithLinkedData = Token & TokenLinkedData;

export type NonRequiredProps = TokenAppearance &
	TokenBuyable &
	TokenGroup &
	Pick<Token, 'description'>;

export type RequiredToken<T extends Token = Token, M extends object = {}> = RequiredExcept<
	T,
	keyof NonRequiredProps,
	M
>;

export type RequiredTokenWithLinkedData = RequiredToken<TokenWithLinkedData>;

export type OptionToken = Option<Token>;
export type OptionTokenId = Option<TokenId>;
export type OptionTokenStandardCode = Option<TokenStandardCode>;

export type TokenToPin = Pick<Token, 'id'> & { network: Pick<Token['network'], 'id'> };

export interface TokenFinancialData {
	balance?: Exclude<OptionBalance, undefined>;
	usdBalance?: number;
	usdPrice?: number;
	usdPriceChangePercentage24h?: number;
	stakeBalance?: bigint;
	stakeUsdBalance?: number;
	claimableStakeBalance?: bigint;
	claimableStakeBalanceUsd?: number;
}
