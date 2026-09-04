export const ETH_BASE_FEE = 21_000n;

export const ETH_FEE_DATA_LISTENER_DELAY = 10000;

// A gas limit is only worth judging next to what the same transaction should need, so the review
// compares the requested limit against a baseline: the larger of this floor and what OISY itself
// resolved for it. The floor keeps the baseline honest when the estimation reverts and the resolved
// gas falls back to `ETH_BASE_FEE`, which would otherwise make any ordinary contract call look
// enormous. It is set around what a common contract interaction (a swap, a mint) consumes.
export const ETH_WALLET_CONNECT_GAS_BASELINE_FLOOR = 200_000n;

// Multiples of that baseline at which the review speaks up: three times it is worth naming as the
// dApp's own choice, ten times it is worth questioning. Both stay short of blocking, and both are
// wider than their Solana counterparts because a gas limit is a ceiling rather than a price:
// unused gas is refunded, and padding an estimate is ordinary dApp behaviour.
export const ETH_WALLET_CONNECT_GAS_NOTICE_MULTIPLIER = 3n;
export const ETH_WALLET_CONNECT_GAS_WARNING_MULTIPLIER = 10n;

// Exponential-backoff retry schedule for transaction-fee fetches that fail (e.g. a transient
// network loss while OISY is backgrounded on mobile). See `EthFeeContext`.
export const ETH_FEE_RETRY_BASE_DELAY = 2_000;
export const ETH_FEE_RETRY_MAX_DELAY = 30_000;
export const ETH_FEE_RETRY_MAX_ATTEMPTS = 5;

// How many digits of a gwei fee actually carry information. Four keeps `1.234` intact and drops
// the fraction of `44,185.0944`, which says nothing about a fee that size.
export const GWEI_SIGNIFICANT_DIGITS = 4;
