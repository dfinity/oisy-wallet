import {
	inferPostMessageSchema,
	PostMessageAllowSigningErrorSchema,
	PostMessageAllowSigningRequestSchema,
	PostMessageAllowSigningResponseDataSchema,
	PostMessageAllowSigningResponseSchema,
	PostMessageAllowSigningStatusSchema,
	PostMessageApproveErrorSchema,
	PostMessageChallengeCompletionErrorSchema,
	PostMessageChallengeCompletionSchema,
	PostMessageCreatePowChallengeErrorSchema,
	PostMessageCreatePowChallengeRequestSchema,
	PostMessageCreatePowChallengeResponseDataSchema,
	PostMessageCreatePowChallengeResponseSchema,
	PostMessageDataRequestBtcSchema,
	PostMessageDataRequestExchangeTimerSchema,
	PostMessageDataRequestIcCkBTCUpdateBalanceSchema,
	PostMessageDataRequestIcCkSchema,
	PostMessageDataRequestIcrcSchema,
	PostMessageDataRequestIcrcStrictSchema,
	PostMessageDataRequestSchema,
	PostMessageDataRequestSolSchema,
	PostMessageDataResponseAuthSchema,
	PostMessageDataResponseBTCAddressSchema,
	PostMessageDataResponseErrorSchema,
	PostMessageDataResponseExchangeErrorSchema,
	PostMessageDataResponseExchangeSchema,
	PostMessageDataResponseSchema,
	PostMessageDataResponseWalletCleanUpSchema,
	PostMessageDataResponseWalletSchema,
	PostMessageJsonDataResponseSchema,
	PostMessageRequestBaseSchema,
	PostMessageResponseSchema,
	PostMessageResponseStatusSchema,
	PostMessageSyncStateSchema
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

// -----------------------------------------------------------------------------
// - The post message types used by the pow.worker.ts and worker.pow.services.ts
// -----------------------------------------------------------------------------

export type PostMessageRequestBase = z.infer<typeof PostMessageRequestBaseSchema>;

export type PostMessageCreatePowChallengeRequest = z.infer<
	typeof PostMessageCreatePowChallengeRequestSchema
>;
export type PostMessageCreatePowChallengeResponseData = z.infer<
	typeof PostMessageCreatePowChallengeResponseDataSchema
>;

export type PostMessageCreatePowChallengeError = z.infer<
	typeof PostMessageCreatePowChallengeErrorSchema
>;
export type PostMessageCreatePowChallengeResponse = z.infer<
	typeof PostMessageCreatePowChallengeResponseSchema
>;
export type PostMessageAllowSigningRequest = z.infer<typeof PostMessageAllowSigningRequestSchema>;
export type PostMessageChallengeCompletion = z.infer<typeof PostMessageChallengeCompletionSchema>;
export type PostMessageAllowSigningStatus = z.infer<typeof PostMessageAllowSigningStatusSchema>;
export type PostMessageAllowSigningResponse = z.infer<typeof PostMessageAllowSigningResponseSchema>;
export type PostMessageApproveError = z.infer<typeof PostMessageApproveErrorSchema>;
export type PostMessageChallengeCompletionError = z.infer<
	typeof PostMessageChallengeCompletionErrorSchema
>;
export type PostMessageAllowSigningError = z.infer<typeof PostMessageAllowSigningErrorSchema>;
export type PostMessageAllowSigningResponseData = z.infer<
	typeof PostMessageAllowSigningResponseDataSchema
>;
