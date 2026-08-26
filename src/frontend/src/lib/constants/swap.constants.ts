import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SUPPORTED_EVM_MAINNET_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { POLYGON_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { ICRC_CK_TOKENS, PUBLIC_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import type { NetworkId } from '$lib/types/network';
import { SwapProvider, type ChainFusionPair, type SwapProvidersConfig } from '$lib/types/swap';
import { toChainFusionPairs } from '$lib/utils/chain-fusion-swap.utils';

export const SWAP_SLIPPAGE_PRESET_VALUES = [0.5, 1.5, 3];
export const [_, SWAP_DEFAULT_SLIPPAGE_VALUE] = SWAP_SLIPPAGE_PRESET_VALUES;
export const SWAP_SLIPPAGE_VALUE_DECIMALS = 4;

export const SWAP_SLIPPAGE_WARNING_VALUE = 7;
export const SWAP_SLIPPAGE_INVALID_VALUE = 50;
export const SWAP_SLIPPAGE_VELORA_INVALID_VALUE = 15;

export const SWAP_VALUE_DIFFERENCE_WARNING_VALUE = -1;
export const SWAP_VALUE_DIFFERENCE_ERROR_VALUE = -5;

export const ICP_SWAP_POOL_FEE = 3000n;

export const SWAP_ETH_TOKEN_PLACEHOLDER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS = 5_000;

export const NEAR_INTENTS_BLOCKCHAIN_MAP: Record<NetworkId, string> = {
	[ETHEREUM_NETWORK_ID]: 'eth',
	[ARBITRUM_MAINNET_NETWORK_ID]: 'arb',
	[BASE_NETWORK_ID]: 'base',
	[BSC_MAINNET_NETWORK_ID]: 'bsc',
	[POLYGON_MAINNET_NETWORK_ID]: 'pol',
	[SOLANA_MAINNET_NETWORK_ID]: 'sol',
	[BTC_MAINNET_NETWORK_ID]: 'btc'
};

export const NEAR_INTENTS_QUOTE_DEADLINE_MS = 3 * 60 * 1000;

// The 1Click deadline is the time by which the deposit must arrive; on expiry the swap
// refunds minus a fee. BTC deposits confirm in tens of minutes, so the window must
// comfortably cover slow blocks. EVM and SOL keep the short deadline above because their
// deposits land in seconds and shorter deadlines mean fresher quotes.
export const NEAR_INTENTS_BTC_QUOTE_DEADLINE_MS = 60 * 60 * 1000;

export const OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK =
	'https://docs.oisy.com/using-oisy-wallet/how-tos/swapping-tokens#manually-withdraw-funds-from-icpswap';

export const NEAR_INTENTS_TOS_LINK =
	'https://docs.near-intents.org/security-compliance/terms-of-service';

export const SWAP_MODE = 'all';
export const SWAP_MODE_MARKET = 'market';
export const SWAP_SIDE = 'SELL';

export const swapProvidersDetails: Partial<Record<SwapProvider, SwapProvidersConfig>> = {
	[SwapProvider.CHAIN_FUSION]: {
		website: 'https://internetcomputer.org/chainfusion',
		name: 'Chain Fusion',
		// TODO: replace with a real logo
		logo: '/images/dapps/chain-fusion-logo.svg'
	},
	[SwapProvider.VELORA]: {
		website: 'https://app.velora.xyz/',
		name: 'Velora',
		logo: '/images/dapps/velora-logo.svg'
	},
	...(NEAR_INTENTS_SWAP_ENABLED
		? {
				[SwapProvider.NEAR_INTENTS]: {
					website: 'https://near-intents.org/',
					name: 'NEAR Intents',
					logo: '/images/dapps/near-intents-logo.svg'
				}
			}
		: {}),
	...(ONESEC_SWAP_ENABLED
		? {
				[SwapProvider.ONE_SEC]: {
					website: 'https://1sec.to/',
					name: '1Sec',
					logo: '/images/dapps/onesec-logo.svg'
				}
			}
		: {})
};

const SUPPORTED_CROSS_SWAP_EVM_NETWORK_IDS = [
	ETHEREUM_NETWORK_ID,
	...SUPPORTED_EVM_MAINNET_NETWORK_IDS
];

const SUPPORTED_CROSS_SWAP_SOL_NETWORK_IDS = [SOLANA_MAINNET_NETWORK_ID];

const SUPPORTED_CROSS_SWAP_NETWORK_IDS = [
	...SUPPORTED_CROSS_SWAP_EVM_NETWORK_IDS,
	...SUPPORTED_CROSS_SWAP_SOL_NETWORK_IDS
];

export const CHAIN_FUSION_PAIRS: ChainFusionPair[] = toChainFusionPairs([
	...ICRC_CK_TOKENS,
	...PUBLIC_ICRC_TOKENS
]);

// EVM networks supported by OneSec for ICP bridging
export const ONESEC_EVM_NETWORK_IDS = [
	ETHEREUM_NETWORK_ID,
	BASE_NETWORK_ID,
	ARBITRUM_MAINNET_NETWORK_ID
];

const CHAIN_FUSION_EVM_NETWORK_IDS = CHAIN_FUSION_SWAP_ENABLED ? [ETHEREUM_NETWORK_ID] : [];

// Bitcoin reaches ICP, and only ICP: ck conversion is its single route into the swap
// universe, and no DEX in the list quotes a BTC pair.
const CHAIN_FUSION_BTC_NETWORK_IDS: NetworkId[] = CHAIN_FUSION_SWAP_ENABLED
	? [BTC_MAINNET_NETWORK_ID]
	: [];

const ICP_PAIRED_EVM_NETWORK_IDS: NetworkId[] = [
	...new Set<NetworkId>([
		...(ONESEC_SWAP_ENABLED ? ONESEC_EVM_NETWORK_IDS : []),
		...CHAIN_FUSION_EVM_NETWORK_IDS
	])
];

const withIcpIfPaired = (networkId: NetworkId): NetworkId[] =>
	ICP_PAIRED_EVM_NETWORK_IDS.includes(networkId)
		? [ICP_NETWORK_ID, ...SUPPORTED_CROSS_SWAP_NETWORK_IDS]
		: SUPPORTED_CROSS_SWAP_NETWORK_IDS;

export const SUPPORTED_CROSS_SWAP_NETWORKS: Record<NetworkId, NetworkId[]> = {
	[ICP_NETWORK_ID]: [
		ICP_NETWORK_ID,
		...ICP_PAIRED_EVM_NETWORK_IDS,
		...CHAIN_FUSION_BTC_NETWORK_IDS
	],
	[BTC_MAINNET_NETWORK_ID]: CHAIN_FUSION_BTC_NETWORK_IDS.length > 0 ? [ICP_NETWORK_ID] : [],
	[ETHEREUM_NETWORK_ID]: withIcpIfPaired(ETHEREUM_NETWORK_ID),
	[ARBITRUM_MAINNET_NETWORK_ID]: withIcpIfPaired(ARBITRUM_MAINNET_NETWORK_ID),
	[BSC_MAINNET_NETWORK_ID]: withIcpIfPaired(BSC_MAINNET_NETWORK_ID),
	[POLYGON_MAINNET_NETWORK_ID]: withIcpIfPaired(POLYGON_MAINNET_NETWORK_ID),
	[BASE_NETWORK_ID]: withIcpIfPaired(BASE_NETWORK_ID),
	[SOLANA_MAINNET_NETWORK_ID]: SUPPORTED_CROSS_SWAP_NETWORK_IDS
};
