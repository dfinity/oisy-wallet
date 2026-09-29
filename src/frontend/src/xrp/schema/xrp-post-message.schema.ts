import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import * as z from 'zod';

const XrpPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<XrpBalance | null>>(),
	// Optional, and the distinction matters: absent means the history could not be read, which is
	// not the same claim as an empty page. Written as `[]` it marked the store initialized and the
	// UI reported "no transactions" for a request that had failed.
	newTransactions: JsonTransactionsTextSchema.optional(),
	// Absent when the lines are unchanged or could not be read; either way the listener keeps what
	// it holds. An empty array is a real answer: the account has no trust lines.
	trustLines: z.custom<XrpTrustLine[]>().optional()
});

export const XrpPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: XrpPostMessageWalletDataSchema
});
