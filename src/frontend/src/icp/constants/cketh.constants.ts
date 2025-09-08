// Worker refresh rate
// We refresh the ckETH timer every 30 seconds to fetch the minter info but, also update the list of pending ETH -> ckETH transactions.
// Note that we use 30 seconds for simplicity reasons. What would be accurate would be to trigger a refresh each time transactions are mined on the Ethereum network. See for example EthFeeContext.svelte.
export const CKETH_MINTER_INFO_TIMER = 30000;
