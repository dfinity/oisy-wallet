// The deposit's share of the Solana fee of the sweep, which the ckSOL minter takes out of every
// mint: the fee of one signature (`FEE_PER_SIGNATURE` in the minter).
export const CKSOL_DEPOSIT_SWEEP_FEE = 5_000n;

// What a sweep leaves on a deposit address for good: the rent-exempt minimum of an account without
// data (`RENT_EXEMPTION_THRESHOLD` in the minter). The minter sweeps the balance above it, so only
// a deposit to an address that does not hold it yet pays for it.
export const CKSOL_DEPOSIT_ADDRESS_RENT = 890_880n;
