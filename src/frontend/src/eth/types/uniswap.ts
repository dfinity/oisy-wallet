import type { EthAddress } from '$eth/types/address';
import type { Token } from '$lib/types/token';

export type UniswapUniversalRouterVersion = '2.0.0' | '2.1.1' | '2.1.2';

export interface UniswapUniversalRouter {
	chainId: bigint;
	address: EthAddress;
	version: UniswapUniversalRouterVersion;
}

// The ABI types of each command's input and of each V4 action's parameters, by their byte.
export interface UniswapLayouts {
	commands: Partial<Record<number, string[]>>;
	actions: Partial<Record<number, string[]>>;
}

export interface UniswapSwapAmount {
	token: Token;
	amount: bigint;
}

// A share of what the router holds of the token at that point, where 10^18 is all of it, or a stated
// amount.
export type UniswapSwapFeeAmount = { share: bigint } | { amount: bigint };

// A fee the swap pays to an address that is not the wallet.
export type UniswapSwapFee = { token: Token; recipient: EthAddress } & UniswapSwapFeeAmount;

// A Permit2 allowance the transaction grants the router. It outlives the transaction.
export interface UniswapSwapApproval {
	token: Token;
	amount: bigint;
	unlimited: boolean;
	// Seconds.
	expiration: number;
}

/**
 * What a Universal Router transaction swaps, stated only from what the router enforces.
 */
export interface UniswapSwap {
	router: UniswapUniversalRouter;
	// `atMost` when the swap is for an exact output, so the input is a maximum.
	paid: UniswapSwapAmount & { atMost: boolean };
	// The least the router lets reach the recipient.
	received: UniswapSwapAmount;
	// Only when the received tokens go to an address that is not the wallet.
	recipient?: EthAddress;
	fees: UniswapSwapFee[];
	approval?: UniswapSwapApproval;
	// Seconds; absent when the transaction sets no deadline, or one too far out to be a date.
	deadline?: number;
}
