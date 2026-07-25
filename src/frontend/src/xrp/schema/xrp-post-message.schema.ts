import { PostMessageDataResponseSchema } from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import * as z from 'zod';

const XrpPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<XrpBalance | null>>()
});

export const XrpPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: XrpPostMessageWalletDataSchema
});
