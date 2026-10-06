import type { Network } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { SolPostMessageDataResponseWalletSchema } from '$sol/schema/sol-post-message.schema';
import type { SolAddress } from '$sol/types/address';
import type { SplTokenAddress } from '$sol/types/spl';
import type * as z from 'zod';

export type SolPostMessageDataResponseWallet = z.infer<
	typeof SolPostMessageDataResponseWalletSchema
>;

// Token ids are symbols and cannot cross the worker boundary, so the network worker speaks in
// source addresses and mints, and the main thread turns them back into the tokens of that network.
export interface SolWalletRouting {
	// The network of all these tokens, for what is reported about their history.
	network: Network;
	nativeTokenId: TokenId;
	splTokenIds: Map<SplTokenAddress, TokenId>;
	// The wallet maps to `null` (native SOL), the associated token account of each token to its mint.
	sourceTokens: Map<SolAddress, SplTokenAddress | null>;
}
