import type { SplTokenAddress } from '$sol/types/spl';
import type { Lamports } from '@solana/kit';

export type SolBalance = Lamports | bigint;

export interface SolNetworkBalances {
	sol: bigint;
	spl: Record<SplTokenAddress, bigint>;
}
