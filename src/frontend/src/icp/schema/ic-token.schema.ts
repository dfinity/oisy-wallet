import { IcTokenDeprecatedSchema } from '$icp/schema/ic-token-deprecated.schema';
import { TokenGroupPropSchema } from '$lib/schema/token-group.schema';
import { TokenMetadataSchema, TokenSchema } from '$lib/schema/token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';
import { CoingeckoCoinsIdSchema } from '$lib/validation/coingecko.validation';
import { UrlSchema } from '$lib/validation/url.validation';
import * as z from 'zod/v4';

export const IcFeeSchema = z.object({
	fee: z.bigint()
});

export const IcAppMetadataSchema = z.object({
	exchangeCoinId: CoingeckoCoinsIdSchema.optional(),
	position: z.number(),
	explorerUrl: UrlSchema.optional()
});

export const IcCanistersSchema = z.object({
	ledgerCanisterId: CanisterIdTextSchema,
	indexCanisterId: CanisterIdTextSchema.optional()
});

export const IcCanistersStrictSchema = IcCanistersSchema.extend({
	indexCanisterId: CanisterIdTextSchema
});

export const IcCkLinkedAssetsSchema = z.object({
	twinToken: TokenSchema.extend({ symbol: z.string() }),
	feeLedgerCanisterId: CanisterIdTextSchema.optional()
});

export const IcCkMetadataSchema = IcCkLinkedAssetsSchema.partial().extend({
	minterCanisterId: CanisterIdTextSchema
});

export const IcInterfaceSchema = z.object({
	...IcCanistersSchema.shape,
	...IcAppMetadataSchema.shape
});

export const IcTokenMetadataSchema = TokenMetadataSchema.extend({
	symbol: z.string() // Make symbol required by removing optional()
});

export const IcTokenSchema = z.object({
	...TokenSchema.shape,
	...IcTokenMetadataSchema.shape,
	...IcFeeSchema.shape,
	...IcInterfaceSchema.shape,
	...IcTokenDeprecatedSchema.shape
});

export const IcTokenWithoutIdSchema = IcTokenSchema.omit({ id: true }).strict();

export const IcCkTokenSchema = z.object({
	...IcTokenSchema.shape,
	...IcCkMetadataSchema.partial().shape
});

export const IcCkInterfaceSchema = z.object({
	...IcInterfaceSchema.shape,
	...IcCkMetadataSchema.shape,
	...TokenGroupPropSchema.shape
});
