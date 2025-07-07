import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import type { SolBalance } from '$sol/types/sol-balance';
import * as z from 'zod/v4';

const SolPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<SolBalance | null>>(),
	newTransactions: JsonTransactionsTextSchema
});

export const SolPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: SolPostMessageWalletDataSchema
});
