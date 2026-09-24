import type { XrpPostMessageDataResponseWalletSchema } from '$xrp/schema/xrp-post-message.schema';
import type * as z from 'zod';

export type XrpPostMessageDataResponseWallet = z.infer<
	typeof XrpPostMessageDataResponseWalletSchema
>;
