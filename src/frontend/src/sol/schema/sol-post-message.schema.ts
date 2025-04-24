import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import type { SolBalance } from '$sol/types/sol-balance';
import * as z from 'zod';

const SolPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<SolBalance | null>>()
});

export const SolPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: SolPostMessageWalletDataSchema
});

const SolPostMessageWalletTransactionsDataSchema = z.object({
	newTransactions: JsonTransactionsTextSchema
});

export const SolPostMessageDataResponseWalletTransactionsSchema =
	PostMessageDataResponseSchema.extend({
		wallet: SolPostMessageWalletTransactionsDataSchema
	});
