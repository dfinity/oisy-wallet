import type { BtcWalletBalance } from '$btc/types/btc';
import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import * as z from 'zod/v4';

const BtcPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<BtcWalletBalance | null>>(),
	newTransactions: JsonTransactionsTextSchema
});

export const BtcPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: BtcPostMessageWalletDataSchema
});
