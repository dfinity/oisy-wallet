import { IcTokenSchema } from '$icp/schema/ic-token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';
import * as z from 'zod';

export const SaveCustomTokenSchema = IcTokenSchema.extend({
	enabled: z.boolean(),
	ledgerCanisterId: CanisterIdTextSchema,
	indexCanisterId: CanisterIdTextSchema
});
