import type { SolPostMessageDataResponseWalletSchema } from '$sol/schema/sol-post-message.schema';
import * as z from 'zod';

export type SolPostMessageDataResponseWallet = z.infer<
	typeof SolPostMessageDataResponseWalletSchema
>;
