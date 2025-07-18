import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { BtcAddress } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import * as z from 'zod/v4';

const BtcPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<bigint | null>>(),
	newTransactions: JsonTransactionsTextSchema,
	address: z.custom<BtcAddress>(),
	network: z.custom<BitcoinNetwork>()
});

export const BtcPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: BtcPostMessageWalletDataSchema
});
