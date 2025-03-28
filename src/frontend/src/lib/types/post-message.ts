import {
	PostMessageDataRequestBtcSchema,
	PostMessageDataRequestExchangeTimerSchema,
	PostMessageDataRequestIcCkBTCUpdateBalanceSchema,
	PostMessageDataRequestIcCkSchema,
	PostMessageDataRequestIcrcSchema,
	PostMessageDataRequestIcrcStrictSchema,
	PostMessageDataRequestPowAllowSignerSchema,
	PostMessageDataRequestPowTimerSchema,
	PostMessageDataRequestSchema,
	PostMessageDataRequestSolSchema,
	PostMessageDataRequestSolvePowChallengeSchema,
	PostMessageDataResponseAuthSchema,
	PostMessageDataResponseBTCAddressSchema,
	PostMessageDataResponseErrorSchema,
	PostMessageDataResponseExchangeErrorSchema,
	PostMessageDataResponseExchangeSchema,
	PostMessageDataResponsePowSchema,
	PostMessageDataResponseSchema,
	PostMessageDataResponseWalletCleanUpSchema,
	PostMessageDataResponseWalletSchema,
	PostMessageJsonDataResponseSchema,
	PostMessageResponseSchema,
	PostMessageResponseStatusSchema,
	PostMessageSyncStateSchema,
	inferPostMessageSchema
} from '$lib/schema/post-message.schema';

import type { ZodType } from 'zod';
import * as z from 'zod';

export type PostMessageDataRequest = z.infer<typeof PostMessageDataRequestSchema>;
export type PostMessageDataResponse = z.infer<typeof PostMessageDataResponseSchema>;

export type PostMessageDataRequestExchangeTimer = z.infer<
	typeof PostMessageDataRequestExchangeTimerSchema
>;

export type PostMessageDataRequestIcrc = z.infer<typeof PostMessageDataRequestIcrcSchema>;

export type PostMessageDataRequestIcrcStrict = z.infer<
	typeof PostMessageDataRequestIcrcStrictSchema
>;

export type PostMessageDataRequestIcCk = z.infer<typeof PostMessageDataRequestIcCkSchema>;

export type PostMessageDataRequestIcCkBTCUpdateBalance = z.infer<
	typeof PostMessageDataRequestIcCkBTCUpdateBalanceSchema
>;

export type PostMessageDataRequestBtc = z.infer<typeof PostMessageDataRequestBtcSchema>;

export type PostMessageDataRequestSol = z.infer<typeof PostMessageDataRequestSolSchema>;

export type PostMessageResponseStatus = z.infer<typeof PostMessageResponseStatusSchema>;

export type PostMessageResponse = z.infer<typeof PostMessageResponseSchema>;

export type PostMessageDataResponseAuth = z.infer<typeof PostMessageDataResponseAuthSchema>;

export type PostMessageDataResponseExchange = z.infer<typeof PostMessageDataResponseExchangeSchema>;

export type PostMessageDataResponseExchangeError = z.infer<
	typeof PostMessageDataResponseExchangeErrorSchema
>;

export type PostMessageDataResponseWallet = z.infer<typeof PostMessageDataResponseWalletSchema>;

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
	ReturnType<typeof inferPostMessageSchema<ZodType<T>>>
>;

export type PostMessageDataRequestPowTimer = z.infer<typeof PostMessageDataRequestPowTimerSchema>;

export type PostMessageDataRequestSolvePowChallenge = z.infer<
	typeof PostMessageDataRequestSolvePowChallengeSchema
>;

export type PostMessageDataRequestPowAllowSigner = z.infer<
	typeof PostMessageDataRequestPowAllowSignerSchema
>;

export type PostMessageDataResponsePow = z.infer<typeof PostMessageDataResponsePowSchema>;
