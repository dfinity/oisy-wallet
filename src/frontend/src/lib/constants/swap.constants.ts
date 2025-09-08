import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SUPPORTED_EVM_MAINNET_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { POLYGON_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import type { NetworkId } from '$lib/types/network';
import { SwapProvider, type SwapProvidersConfig } from '$lib/types/swap';

export const SWAP_SLIPPAGE_PRESET_VALUES = [0.5, 1.5, 3];
export const [_, SWAP_DEFAULT_SLIPPAGE_VALUE] = SWAP_SLIPPAGE_PRESET_VALUES;
export const SWAP_SLIPPAGE_VALUE_DECIMALS = 4;

export const SWAP_SLIPPAGE_WARNING_VALUE = 7;
export const SWAP_SLIPPAGE_INVALID_VALUE = 50;
export const SWAP_SLIPPAGE_VELORA_INVALID_VALUE = 15;

export const SWAP_VALUE_DIFFERENCE_WARNING_VALUE = -1;
export const SWAP_VALUE_DIFFERENCE_ERROR_VALUE = -5;

export const KONG_SWAP_PROVIDER = 'kongSwap';
export const ICP_SWAP_PROVIDER = 'icpSwap';
export const VELORA_SWAP_PROVIDER = 'velora';

export const ICP_SWAP_POOL_FEE = 3000n;

export const SWAP_ETH_TOKEN_PLACEHOLDER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const SWAP_DELTA_TIMEOUT_MS = 5 * 60_000;
export const SWAP_DELTA_INTERVAL_MS = 3_000;
export const SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS = 5_000;

export const OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK =
	'https://docs.oisy.com/using-oisy-wallet/how-tos/swapping-tokens#manually-withdraw-funds-from-icpswap';

export const SWAP_MODE = 'all';
export const SWAP_SIDE = 'SELL';

export const swapProvidersDetails: Record<string, SwapProvidersConfig> = {
	[SwapProvider.VELORA]: {
		website: 'https://app.velora.xyz/',
		name: 'Velora',
		logo: '/images/dapps/velora-logo.svg'
	}
};

export const SUPPORTED_CROSS_SWAP_NETWORKS: Record<NetworkId, NetworkId[]> = {
	[ICP_NETWORK_ID]: [ICP_NETWORK_ID],
	[ETHEREUM_NETWORK_ID]: [ETHEREUM_NETWORK_ID, ...SUPPORTED_EVM_MAINNET_NETWORK_IDS],
	[ARBITRUM_MAINNET_NETWORK_ID]: [ARBITRUM_MAINNET_NETWORK_ID],
	[BSC_MAINNET_NETWORK_ID]: [BSC_MAINNET_NETWORK_ID],
	[POLYGON_MAINNET_NETWORK_ID]: [POLYGON_MAINNET_NETWORK_ID],
	[BASE_NETWORK_ID]: [ETHEREUM_NETWORK_ID, ...SUPPORTED_EVM_MAINNET_NETWORK_IDS]
};
