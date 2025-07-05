import type { SolPostMessageDataResponseWalletSchema } from '$sol/schema/sol-post-message.schema';
import type * as z from 'zod/v4';

export type SolPostMessageDataResponseWallet = z.infer<
	typeof SolPostMessageDataResponseWalletSchema
>;
