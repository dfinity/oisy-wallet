import { TokenSchema } from '$lib/schema/token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';
import { CoingeckoCoinsIdSchema } from '$lib/validation/coingecko.validation';
import { UrlSchema } from '$lib/validation/url.validation';
import { z } from 'zod';

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
	twinToken: TokenSchema,
	feeLedgerCanisterId: CanisterIdTextSchema.optional()
});

export const IcCkMetadataSchema = IcCkLinkedAssetsSchema.partial().extend({
	minterCanisterId: CanisterIdTextSchema
});

export const IcInterfaceSchema = IcCanistersSchema.merge(IcAppMetadataSchema);

export const IcTokenSchema = TokenSchema.merge(IcFeeSchema).merge(IcInterfaceSchema);

export const IcTokenWithoutIdSchema = IcTokenSchema.omit({ id: true }).strict();

export const IcCkTokenSchema = IcTokenSchema.merge(IcCkMetadataSchema.partial());

export const IcCkInterfaceSchema = IcInterfaceSchema.merge(IcCkMetadataSchema);
