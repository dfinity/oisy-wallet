import { PostMessageDataResponseSchema } from '$lib/schema/post-message.schema';
import type { CertifiedData } from '$lib/types/store';
import { z } from 'zod';
import type { Lamports } from '@solana/rpc-types';

const SolPostMessageWalletDataSchema = z.object({
	balance: z.custom<CertifiedData<Lamports | null>>()
});

export const SolPostMessageDataResponseWalletSchema = PostMessageDataResponseSchema.extend({
	wallet: SolPostMessageWalletDataSchema
});
