export const SWAP_SLIPPAGE_PRESET_VALUES = [0.5, 1.5, 3];
export const [_, SWAP_DEFAULT_SLIPPAGE_VALUE] = SWAP_SLIPPAGE_PRESET_VALUES;
export const SWAP_SLIPPAGE_VALUE_DECIMALS = 4;

export const SWAP_SLIPPAGE_WARNING_VALUE = 7;
export const SWAP_SLIPPAGE_INVALID_VALUE = 50;

export const SWAP_VALUE_DIFFERENCE_WARNING_VALUE = -1;
export const SWAP_VALUE_DIFFERENCE_ERROR_VALUE = -5;

export const KONG_SWAP_PROVIDER = 'kongSwap';
export const ICP_SWAP_PROVIDER = 'icpSwap';
export const VELORA_SWAP_PROVIDER = 'velora';

export const ICP_SWAP_POOL_FEE = 3000n;

export const SWAP_MODE = 'all';
export const SWAP_SIDE = 'SELL';

export const SWAP_ETH_TOKEN_PLACEHOLDER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const SWAP_DELTA_TIMEOUT_MS = 5 * 60_000;
export const SWAP_DELTA_INTERVAL_MS = 3_000;
