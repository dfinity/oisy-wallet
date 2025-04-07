import type { BtcPostMessageDataResponseWalletSchema } from '$btc/schema/btc-post-message.schema';
import type * as z from 'zod';

export type BtcPostMessageDataResponseWallet = z.infer<
	typeof BtcPostMessageDataResponseWalletSchema
>;
