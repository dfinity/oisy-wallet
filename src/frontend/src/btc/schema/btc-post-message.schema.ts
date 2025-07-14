import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { BtcAddress } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import * as z from 'zod/v4';

const BtcPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<bigint | null>>(),
	newTransactions: JsonTransactionsTextSchema,
	address: z.custom<BtcAddress>()
});

export const BtcPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: BtcPostMessageWalletDataSchema
});
