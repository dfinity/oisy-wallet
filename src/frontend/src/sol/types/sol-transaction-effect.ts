import type { SplTokenAddress } from '$sol/types/spl';

/**
 * What one asset did to this wallet across a whole transaction.
 *
 * `tokenAddress` is absent for native SOL. The net is signed from the wallet's side: negative is
 * what left it, positive is what arrived.
 */
export interface SolTransactionEffectLeg {
	tokenAddress?: SplTokenAddress;
	decimals: number;
	net: bigint;
}

/**
 * The effect of a whole transaction on this wallet, taken from the confirmed balances rather than
 * from its instructions.
 *
 * The distinction is the point. Rows in the activity list exist only for instructions OISY could
 * decode, so summing them describes the decodable part of a transaction and quietly calls it the
 * whole. `meta.preBalances`/`postBalances` and the token balances either side are what the network
 * recorded actually happening, so they hold whether or not a single instruction was understood.
 *
 * `instructionsCount` counts every instruction the transaction carried, inner ones included, so a
 * group can say how much of itself it is able to show instead of implying it shows all of it.
 */
export interface SolTransactionEffect {
	legs: SolTransactionEffectLeg[];
	instructionsCount: number;
}
