import { PostMessageDataResponseSchema } from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import type { KaspaAddress } from '$kaspa/types/address';
import type { KaspaNetworkType } from '$kaspa/providers/kaspa-api.providers';
import * as z from 'zod';

export const PostMessageDataRequestKaspaSchema = z.object({
	address: z.custom<CertifiedData<KaspaAddress>>(),
	kaspaNetwork: z.custom<KaspaNetworkType>()
});

export const KaspaPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: z.object({
		balance: z.custom<CertifiedData<bigint | null>>(),
		newTransactions: z.string().optional()
	})
});
