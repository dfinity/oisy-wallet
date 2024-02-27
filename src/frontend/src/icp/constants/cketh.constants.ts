import { PROD } from '$lib/constants/app.constants';

// TODO(GIX-2251): replace with an amount fetched from upcoming get_minter_info endpoint.
export const CKETH_MIN_WITHDRAWAL_AMOUNT = PROD ? 30_000_000_000_000_000n : 10_000_000_000_000_000n;

// Worker refresh rate
// We refresh the ckETH timer every 30 seconds to fetch the minter info but, also update the list of pending ETH -> ckETH transactions.
// Note that we use 30 seconds for simplicity reasons. What would be accurate would be to trigger a refresh each time transactions are mined on the Ethereum network. See for example FeeContext.svelte.
export const CKETH_MINTER_INFO_TIMER = 30000;
