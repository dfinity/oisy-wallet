import { BtcPostMessageDataResponseWalletSchema } from '$btc/schema/btc-post-message.schema';
import { z } from 'zod';

export type BtcPostMessageDataResponseWallet = z.infer<
	typeof BtcPostMessageDataResponseWalletSchema
>;
