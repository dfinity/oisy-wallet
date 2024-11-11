import {
	JsonTransactionsTextSchema,
	PostMessageDataRequestBtcSchema,
	PostMessageDataRequestExchangeTimerSchema,
	PostMessageDataRequestIcCkBTCUpdateBalanceSchema,
	PostMessageDataRequestIcCkSchema,
	PostMessageDataRequestIcrcSchema,
	PostMessageDataRequestSchema,
	PostMessageDataResponseAuthSchema,
	PostMessageDataResponseBTCAddressSchema,
	PostMessageDataResponseErrorSchema,
	PostMessageDataResponseExchangeErrorSchema,
	PostMessageDataResponseExchangeSchema,
	PostMessageDataResponseSchema,
	PostMessageDataResponseWalletCleanUpSchema,
	PostMessageJsonDataResponseSchema,
	PostMessageRequestSchema,
	PostMessageResponseSchema,
	PostMessageResponseStatusSchema,
	PostMessageSchema,
	PostMessageSyncStateSchema
} from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';

import { z, type ZodType } from 'zod';

export type PostMessageRequest = z.infer<typeof PostMessageRequestSchema>;

export type PostMessageDataRequest = z.infer<typeof PostMessageDataRequestSchema>;
export type PostMessageDataResponse = z.infer<typeof PostMessageDataResponseSchema>;

export type PostMessageDataRequestExchangeTimer = z.infer<
	typeof PostMessageDataRequestExchangeTimerSchema
>;

export type PostMessageDataRequestIcrc = z.infer<typeof PostMessageDataRequestIcrcSchema>;

export type PostMessageDataRequestIcCk = z.infer<typeof PostMessageDataRequestIcCkSchema>;

export type PostMessageDataRequestIcCkBTCUpdateBalance = z.infer<
	typeof PostMessageDataRequestIcCkBTCUpdateBalanceSchema
>;

export type PostMessageDataRequestBtc = z.infer<typeof PostMessageDataRequestBtcSchema>;

export type PostMessageResponseStatus = z.infer<typeof PostMessageResponseStatusSchema>;

export type PostMessageResponse = z.infer<typeof PostMessageResponseSchema>;

export type PostMessageDataResponseAuth = z.infer<typeof PostMessageDataResponseAuthSchema>;

export type PostMessageDataResponseExchange = z.infer<typeof PostMessageDataResponseExchangeSchema>;

export type PostMessageDataResponseExchangeError = z.infer<
	typeof PostMessageDataResponseExchangeErrorSchema
>;

export type JsonTransactionsText = z.infer<typeof JsonTransactionsTextSchema>;

// TODO: can maybe be simplified?
type PostMessageWalletData<T> = Omit<T, 'transactions' | 'balance'> & {
	balance: CertifiedData<bigint>;
	newTransactions: JsonTransactionsText;
};

export interface PostMessageDataResponseWallet<T = unknown> extends PostMessageDataResponse {
	wallet: PostMessageWalletData<T>;
}

export type PostMessageDataResponseError = z.infer<typeof PostMessageDataResponseErrorSchema>;

export type PostMessageDataResponseWalletCleanUp = z.infer<
	typeof PostMessageDataResponseWalletCleanUpSchema
>;

export type PostMessageJsonDataResponse = z.infer<typeof PostMessageJsonDataResponseSchema>;

export type PostMessageSyncState = z.infer<typeof PostMessageSyncStateSchema>;

export type PostMessageDataResponseBTCAddress = z.infer<
	typeof PostMessageDataResponseBTCAddressSchema
>;

export type PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> = z.infer<
	ReturnType<typeof PostMessageSchema<ZodType<T>>>
>;
