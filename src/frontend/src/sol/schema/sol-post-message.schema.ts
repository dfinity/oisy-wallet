import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema
} from '$lib/schema/post-message.schema';
import type { SolNetworkBalances } from '$sol/types/sol-balance';
import type { SolUnreadableTransaction } from '$sol/types/sol-transaction';
import * as z from 'zod';

const SolPostMessageWalletDataSchema = z.object({
	// Every balance of the network: token ids cannot cross the worker boundary, so SPL balances are
	// keyed by mint.
	balances: z.custom<SolNetworkBalances>(),
	// `SolResolvedTransaction[]`: each record with the sources whose history returned it.
	newTransactions: JsonTransactionsTextSchema,
	// The new signatures whose transaction the RPC refused to return, left out of `newTransactions`.
	unreadableTransactions: z.array(z.custom<SolUnreadableTransaction>()).optional(),
	// Set when the balances were read but the history was not: the message carries no word on the
	// transactions, not an empty page of them.
	transactionsUnavailable: z.boolean().optional()
});

export const SolPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: SolPostMessageWalletDataSchema
});
