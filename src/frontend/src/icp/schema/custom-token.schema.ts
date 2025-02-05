import * as z from 'zod';
import { IcTokenSchema } from '$icp/schema/ic-token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';

export const SaveCustomTokenSchema = IcTokenSchema.extend({
	enabled: z.boolean(),
	ledgerCanisterId: CanisterIdTextSchema,
	indexCanisterId: CanisterIdTextSchema
})