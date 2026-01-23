import type {
	KaspaPostMessageDataResponseWalletSchema,
	PostMessageDataRequestKaspaSchema
} from '$kaspa/schema/kaspa-post-message.schema';
import type * as z from 'zod';

export type PostMessageDataRequestKaspa = z.infer<typeof PostMessageDataRequestKaspaSchema>;

export type KaspaPostMessageDataResponseWallet = z.infer<
	typeof KaspaPostMessageDataResponseWalletSchema
>;
