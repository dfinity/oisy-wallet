import type { SolAddress } from '$sol/types/address';

/**
 * Programs OISY does not decode but can at least name.
 *
 * Solana has no on-chain registry of program names, and the interface a program publishes for
 * itself only exists for Anchor ones: the three below that publish nothing would otherwise show as
 * an address and nothing more. The Anchor ones are listed too, because a name written for a
 * compiler (`lb_clmm`, `raydium_cp_swap`) is not the name the user knows the venue by.
 *
 * A name here says which program the message calls, and nothing about whether calling it is safe.
 * The instruction stays unreviewed either way: a known venue invoked with a hostile instruction is
 * the ordinary shape of an attack, not an exception to it.
 *
 * Every address was read on mainnet before it was written down. Getting one wrong would put a
 * trusted name on a program that is not it, which is worse than showing no name at all, so an
 * entry belongs here only once its address has been checked against the chain.
 */
export const SOLANA_KNOWN_PROGRAM_NAMES: Record<SolAddress, string> = {
	JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 'Jupiter v6',
	whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Orca Whirlpool',
	'675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM v4',
	CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: 'Raydium CLMM',
	CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C: 'Raydium CPMM',
	LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: 'Meteora DLMM',
	'6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'Pump.fun',
	PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY: 'Phoenix',
	metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: 'Metaplex Token Metadata',
	SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu: 'Squads v3',
	SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf: 'Squads v4'
};
