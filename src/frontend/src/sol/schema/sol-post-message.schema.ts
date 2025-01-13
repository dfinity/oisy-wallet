import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import type { SolBalance } from '$sol/types/sol-balance';
import { z } from 'zod';

const SolPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<SolBalance | null>>(),
	newTransactions: JsonTransactionsTextSchema
});

export const SolPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: SolPostMessageWalletDataSchema
});
