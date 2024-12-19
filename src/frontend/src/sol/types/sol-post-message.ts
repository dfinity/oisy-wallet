import { z } from 'zod';
import type { SolPostMessageDataResponseWalletSchema } from '$sol/schema/sol-post-message.schema';

export type SolPostMessageDataResponseWallet = z.infer<
	typeof SolPostMessageDataResponseWalletSchema
>;
