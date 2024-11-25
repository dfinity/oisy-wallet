import {
	JsonTransactionsTextSchema,
	PostMessageDataResponseSchema,
	PostMessageWalletDataSchema
} from '$lib/schema/post-message.schema';

const BtcPostMessageWalletDataSchema = PostMessageWalletDataSchema.extend({
	newTransactions: JsonTransactionsTextSchema
});

export const BtcPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: BtcPostMessageWalletDataSchema
});
