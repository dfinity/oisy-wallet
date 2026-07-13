export const ETH_BASE_FEE = 21_000n;

export const ETH_FEE_DATA_LISTENER_DELAY = 10000;

// Exponential-backoff retry schedule for transaction-fee fetches that fail (e.g. a transient
// network loss while OISY is backgrounded on mobile). See `EthFeeContext`.
export const ETH_FEE_RETRY_BASE_DELAY = 2_000;
export const ETH_FEE_RETRY_MAX_DELAY = 30_000;
export const ETH_FEE_RETRY_MAX_ATTEMPTS = 5;
