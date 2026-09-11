import type { SplTokenAddress } from '$sol/types/spl';
import type { Lamports } from '@solana/kit';

export type SolBalance = Lamports | bigint;

export interface SolNetworkBalances {
	sol: bigint;
	// Partial on purpose: a token whose balance cannot be read is left out, not reported as zero.
	spl: Partial<Record<SplTokenAddress, bigint>>;
}
