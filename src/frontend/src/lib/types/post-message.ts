import {
	type PostMessageAllowSigningRequestSchema,
	type PostMessageAllowSigningResponseSchema,
	type PostMessageBaseSchema,
	type PostMessageCreatePowChallengeRequestSchema,
	type PostMessageCreatePowChallengeResponseSchema,
	type PostMessageDataRequestBtcSchema,
	type PostMessageDataRequestExchangeTimerSchema,
	type PostMessageDataRequestIcCkBTCUpdateBalanceSchema,
	type PostMessageDataRequestIcCkSchema,
	type PostMessageDataRequestIcrcSchema,
	type PostMessageDataRequestIcrcStrictSchema,
	type PostMessageDataRequestSchema,
	type PostMessageDataRequestSolSchema,
	type PostMessageDataResponseAuthSchema,
	type PostMessageDataResponseBTCAddressSchema,
	type PostMessageDataResponseErrorSchema,
	type PostMessageDataResponseExchangeErrorSchema,
	type PostMessageDataResponseExchangeSchema,
	type PostMessageDataResponseSchema,
	type PostMessageDataResponseWalletCleanUpSchema,
	type PostMessageDataResponseWalletSchema,
	type PostMessageJsonDataResponseSchema,
	type PostMessageRequestBaseSchema,
	type PostMessageResponseBaseSchema,
	type PostMessageResponseSchema,
	type PostMessageResponseStatusSchema,
	type PostMessageSyncStateSchema,
	type inferPostMessageSchema
} from '$lib/schema/post-message.schema';
import type * as z from 'zod';
import type { ZodType } from 'zod';

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

// -----------------------------------------------------------------------------------------------
// The post message types used for short polling between:
// pow.worker.ts <--->  worker.pow.services.ts
// -----------------------------------------------------------------------------------------------
// Base Types
export type PostMessageBase = z.infer<typeof PostMessageBaseSchema>;
export type PostMessageRequestBase = z.infer<typeof PostMessageRequestBaseSchema>;
export type PostMessageResponseBase = z.infer<typeof PostMessageResponseBaseSchema>;
export type PostMessageCreatePowChallengeRequest = z.infer<
	typeof PostMessageCreatePowChallengeRequestSchema
>;
export type PostMessageCreatePowChallengeResponse = z.infer<
	typeof PostMessageCreatePowChallengeResponseSchema
>;
export type PostMessageAllowSigningRequest = z.infer<typeof PostMessageAllowSigningRequestSchema>;
export type PostMessageAllowSigningResponse = z.infer<typeof PostMessageAllowSigningResponseSchema>;
