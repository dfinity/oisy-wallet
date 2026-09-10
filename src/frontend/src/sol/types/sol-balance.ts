import type { SplTokenAddress } from '$sol/types/spl';

export interface SolNetworkBalances {
	sol: bigint;
	spl: Record<SplTokenAddress, bigint>;
}
