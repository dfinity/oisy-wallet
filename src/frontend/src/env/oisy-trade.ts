// Permanent per-provider flag for OISY TRADE, the sole gate for the Trading
// surface now that the temporary whole-surface feature flag is gone. Build-time
// like the other env flags, so flipping it ships with a deploy — this lets the
// provider be disabled independently (e.g. if its canister is unreachable).
export const OISY_TRADE_ENABLED = true;
