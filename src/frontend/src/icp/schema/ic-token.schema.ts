import { EnvIcrcTokenMetadataSchema } from '$env/schema/env-icrc-token.schema';
import { IcTokenDeprecatedSchema } from '$icp/schema/ic-token-deprecated.schema';
import { CoingeckoCoinsIdSchema } from '$lib/schema/coingecko.schema';
import { TokenGroupPropSchema } from '$lib/schema/token-group.schema';
import { TokenSchema } from '$lib/schema/token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';
import { UrlSchema } from '$lib/validation/url.validation';
import type { IcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import * as z from 'zod';

export const IcFeeSchema = z.object({
	fee: z.bigint()
});

export const IcAppMetadataSchema = z.object({
	exchangeCoinId: CoingeckoCoinsIdSchema.optional(),
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

export const IcMetadataSchema = z.object({
	mintingAccount: z.custom<IcrcAccount>().optional()
});

export const IcInterfaceSchema = z.object({
	...IcCanistersSchema.shape,
	...IcAppMetadataSchema.shape,
	...IcMetadataSchema.shape
});

export const IcTokenSchema = z.object({
	...TokenSchema.shape,
	...IcFeeSchema.shape,
	...IcInterfaceSchema.shape,
	...IcTokenDeprecatedSchema.shape,
	...EnvIcrcTokenMetadataSchema.pick({ alternativeName: true }).shape
});

export const IcTokenWithoutIdSchema = IcTokenSchema.omit({ id: true }).strict();

export const IcTokenWithIcrc2SupportedSchema = IcTokenSchema.extend({
	isIcrc2: z.boolean()
}).strict();

export const IcCkTokenSchema = z.object({
	...IcTokenSchema.shape,
	...IcCkMetadataSchema.partial().shape
});

export const IcCkInterfaceSchema = z.object({
	...IcInterfaceSchema.shape,
	...IcCkMetadataSchema.shape,
	...TokenGroupPropSchema.shape
});
