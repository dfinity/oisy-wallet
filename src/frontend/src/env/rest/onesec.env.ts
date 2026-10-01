export const ONESEC_SWAP_ENABLED = true;

/**
 * Restricts OneSec swaps to the unwrapping direction: a bridged position may be swapped
 * back to the chain its token is native to, but never further away from it.
 *
 * OneSec's `evmMode` says which chain a token is native to — `minter` tokens are ICP-native
 * and get a wrapped ERC-20 minted on EVM, `locker` tokens are EVM-native and get a wrapped
 * ICRC ledger minted on ICP. So this flag keeps EVM→ICP for ICP, BOB, GLDT and ckBTC, and
 * keeps ICP→EVM for USDC, USDT and cbBTC.
 *
 * OISY is winding this integration down to its exit path only: a user is no longer routed
 * into a bridged position, while balances already held keep a way back out. Set to `false`
 * to offer both directions again.
 */
export const ONESEC_UNWRAP_ONLY = true;
