// BSC validators enforce a minimum `gasTipCap` of 1 gwei (since the 2024 BSC hard-fork).
// Infura's ethers provider and Gas API occasionally return values below that floor, which
// causes the node to reject the transaction with `transaction underpriced: gas tip cap X,
// minimum needed 1000000000`. We clamp the client-side estimate to this floor to avoid
// that failure mode on BSC mainnet and testnet.
export const BSC_MIN_MAX_PRIORITY_FEE_PER_GAS = 1_000_000_000n; // 1 gwei

// Keep `maxFeePerGas` safely above the tip floor so the EIP-1559 invariant
// `maxFeePerGas >= maxPriorityFeePerGas` still holds and transactions have
// enough headroom for the base-fee component.
export const BSC_MIN_MAX_FEE_PER_GAS = 3_000_000_000n; // 3 gwei
