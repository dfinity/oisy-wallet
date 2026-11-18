import { NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';

// The deposit's share of the Solana fee of the sweep, which the ckSOL minter takes out of every
// mint: the fee of one signature (`FEE_PER_SIGNATURE` in the minter).
export const CKSOL_DEPOSIT_SWEEP_FEE = 5_000n;

// What a sweep leaves on a deposit address for good: the rent-exempt minimum of an account without
// data (`RENT_EXEMPTION_THRESHOLD` in the minter). The minter sweeps the balance above it, so only
// a deposit to an address that does not hold it yet pays for it.
export const CKSOL_DEPOSIT_ADDRESS_RENT = 890_880n;

// The ckSOL minter's last scan of a `watch_deposit_address` window comes half an hour before the
// window ends: it scans hourly up to 23.5 hours of a 24-hour window.
export const CKSOL_LAST_SCAN_BEFORE_WINDOW_END_NANOS = 30n * NANO_SECONDS_IN_MINUTE;

// How long after the `watch_deposit_address` answer a SOL transfer may still land: signing, the
// row write, the broadcast and the lifetime of the transfer's blockhash fit well within it.
export const CKSOL_TRANSFER_LANDING_NANOS = 5n * NANO_SECONDS_IN_MINUTE;
