import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import { z } from 'zod';
import type { BigNumber } from '@ethersproject/bignumber';

const SolPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<BigNumber | null>>(),
	newTransactions: JsonTransactionsTextSchema
});

export const SolPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: SolPostMessageWalletDataSchema
});
