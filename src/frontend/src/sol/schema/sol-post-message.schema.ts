import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { SolNetworkBalances } from '$sol/types/sol-balance';
import * as z from 'zod';

const SolPostMessageWalletDataSchema = z.object({
	// Every balance of the network: token ids cannot cross the worker boundary, so SPL balances are
	// keyed by mint.
	balances: z.custom<SolNetworkBalances>(),
	// `SolResolvedTransaction[]`: each record with the sources whose history returned it.
	newTransactions: JsonTransactionsTextSchema
});

export const SolPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: SolPostMessageWalletDataSchema
});
