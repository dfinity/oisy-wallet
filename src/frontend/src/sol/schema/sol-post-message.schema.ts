import { PostMessageDataResponseSchema } from '$lib/schema/post-message.schema';
import type { Balance } from '$lib/types/balance';
import type { CertifiedData } from '$lib/types/store';
import { z } from 'zod';

const SolPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<Balance | null>>()
});

export const SolPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: SolPostMessageWalletDataSchema
});
