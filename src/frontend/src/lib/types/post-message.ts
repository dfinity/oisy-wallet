import type {
	PostMessageDataErrorSchema,
	PostMessageDataRequestBtcSchema,
	PostMessageDataRequestDip20Schema,
	PostMessageDataRequestExchangeTimerSchema,
	PostMessageDataRequestIcCkBTCUpdateBalanceSchema,
	PostMessageDataRequestIcCkSchema,
	PostMessageDataRequestIcpSchema,
	PostMessageDataRequestIcrcSchema,
	PostMessageDataRequestIcrcStrictSchema,
	PostMessageDataRequestSchema,
	PostMessageDataRequestSolSchema,
	PostMessageDataResponseAuthSchema,
	PostMessageDataResponseBTCAddressSchema,
	PostMessageDataResponseErrorSchema,
	PostMessageDataResponseExchangeErrorSchema,
	PostMessageDataResponseExchangeSchema,
	PostMessageDataResponseLooseSchema,
	PostMessageDataResponsePowProtectorNextAllowanceSchema,
	PostMessageDataResponsePowProtectorProgressSchema,
	PostMessageDataResponseWalletCleanUpSchema,
	PostMessageDataResponseWalletSchema,
	PostMessageJsonDataResponseSchema,
	PostMessageResponseSchema,
	PostMessageResponseStatusSchema,
	PostMessageSyncStateSchema,
	inferPostMessageSchema
} from '$lib/schema/post-message.schema';
import type * as z from 'zod/v4';
import type { ZodType } from 'zod/v4';

export type PostMessageDataRequest = z.infer<typeof PostMessageDataRequestSchema>;
type PostMessageDataResponseLoose = z.infer<typeof PostMessageDataResponseLooseSchema>;

export type PostMessageDataRequestExchangeTimer = z.infer<
	typeof PostMessageDataRequestExchangeTimerSchema
>;

export type PostMessageDataRequestIcrc = z.infer<typeof PostMessageDataRequestIcrcSchema>;

export type PostMessageDataRequestIcrcStrict = z.infer<
	typeof PostMessageDataRequestIcrcStrictSchema
>;

export type PostMessageDataRequestDip20 = z.infer<typeof PostMessageDataRequestDip20Schema>;

export type PostMessageDataRequestIcp = z.infer<typeof PostMessageDataRequestIcpSchema>;

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

export type PostMessageDataError = z.infer<typeof PostMessageDataErrorSchema>;

export type PostMessageDataResponseWalletCleanUp = z.infer<
	typeof PostMessageDataResponseWalletCleanUpSchema
>;

export type PostMessageJsonDataResponse = z.infer<typeof PostMessageJsonDataResponseSchema>;

export type PostMessageSyncState = z.infer<typeof PostMessageSyncStateSchema>;

export type PostMessageDataResponseBTCAddress = z.infer<
	typeof PostMessageDataResponseBTCAddressSchema
>;

export type PostMessageDataResponsePowProtectorProgress = z.infer<
	typeof PostMessageDataResponsePowProtectorProgressSchema
>;

export type PostMessageDataResponsePowProtectorNextAllowance = z.infer<
	typeof PostMessageDataResponsePowProtectorNextAllowanceSchema
>;

export type PostMessage<T extends PostMessageDataRequest | PostMessageDataResponseLoose> = z.infer<
	ReturnType<typeof inferPostMessageSchema<ZodType<T>>>
>;
