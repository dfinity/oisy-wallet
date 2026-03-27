import type {
	IcCanistersSchema,
	IcCanistersStrictSchema,
	IcCkInterfaceSchema,
	IcCkLinkedAssetsSchema,
	IcCkMetadataSchema,
	IcCkTokenSchema,
	IcFeeSchema,
	IcInterfaceSchema,
	IcTokenSchema,
	IcTokenWithoutIdSchema
} from '$icp/schema/ic-token.schema';
import type { Nullish } from '@dfinity/zod-schemas';
import type * as z from 'zod';

export type IcFee = z.infer<typeof IcFeeSchema>;

export type IcCanisters = z.infer<typeof IcCanistersSchema>;

export type IcCanistersStrict = z.infer<typeof IcCanistersStrictSchema>;

export type IcCkLinkedAssets = z.infer<typeof IcCkLinkedAssetsSchema>;

export type IcCkMetadata = z.infer<typeof IcCkMetadataSchema>;

export type IcInterface = z.infer<typeof IcInterfaceSchema>;

export type IcToken = z.infer<typeof IcTokenSchema>;

export type IcTokenWithoutId = z.infer<typeof IcTokenWithoutIdSchema>;

export type IcCkToken = z.infer<typeof IcCkTokenSchema>;

export type IcCkInterface = z.infer<typeof IcCkInterfaceSchema>;

export type OptionIcToken = Nullish<IcToken>;
export type OptionIcCkToken = Nullish<IcCkToken>;

export enum IcTokenStandards {
	icrc1 = 'ICRC-1',
	icrc2 = 'ICRC-2',
	icrc7 = 'ICRC-7'
}
