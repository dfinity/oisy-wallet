import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SUPPORTED_EVM_MAINNET_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { POLYGON_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { XRP_MAINNET_NETWORK_ID } from '$env/networks/networks.xrp.env';
import {
	NEAR_INTENTS_BTC_SWAP_ENABLED,
	NEAR_INTENTS_SWAP_ENABLED,
	NEAR_INTENTS_XRP_SWAP_ENABLED
} from '$env/rest/near-intents.env';
import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { ICRC_CK_TOKENS, PUBLIC_ICRC_TOKENS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.env';
import {
	OISY_TRADE_LEARN_MORE_URL,
	OISY_TRADE_PROVIDER_NAME
} from '$lib/constants/oisy-trade.constants';
import { MOTION_EASE_OUT_CSS } from '$lib/constants/transition.constants';
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

// In-flight balance queries during a Help pool scan. The candidate count is the pools whose both
// legs the user has enabled: 89 with only the tokens OISY ships, and up to the whole factory table
// (876 pools, measured 2026-09-22) with custom ones.
export const ICP_SWAP_SCAN_CONCURRENCY = 10;

export const SWAP_ETH_TOKEN_PLACEHOLDER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS = 5_000;

// Candidate dwell time, not a minimum quote duration: a ready offer always wins immediately.
export const SWAP_PROVIDER_CYCLE_INTERVAL_MS = 650;

// Selected Text Loop spring (k=900, c=80, m=10), sampled at 33 equally spaced times.
// p(t)=1-exp(-4t)*(cos(sqrt(74)t)+4/sqrt(74)*sin(sqrt(74)t)); first p=1 at
// T=(PI-atan(sqrt(74)/4))/sqrt(74). Map [0,T] to the shared turn budget: no overshoot/tail.
export const SWAP_PROVIDER_TURN_EASING =
	'linear(0, 0.002343, 0.009184, 0.020235, 0.035208, 0.053811, 0.075752, 0.100739, 0.128485, 0.158705, 0.191118, 0.225449, 0.26143, 0.298802, 0.337312, 0.376716, 0.416781, 0.457285, 0.498013, 0.538764, 0.579348, 0.619586, 0.659311, 0.698368, 0.736612, 0.773913, 0.810151, 0.845217, 0.879016, 0.911463, 0.942482, 0.972012, 1)';

// A brief borderless confirmation, not a celebration or a minimum quote delay.
export const SWAP_PROVIDER_CONFIRMATION_MOTION = {
	duration: 250,
	// Ease each segment, not the whole clock: the squeeze must still be visible during recall.
	easing: 'linear',
	keyframes: [
		{ transform: 'scale(1)', offset: 0, easing: MOTION_EASE_OUT_CSS },
		{ transform: 'scale(1.01, 0.95)', offset: 0.35, easing: MOTION_EASE_OUT_CSS },
		{ transform: 'scale(0.995, 1.02)', offset: 0.7, easing: MOTION_EASE_OUT_CSS },
		{ transform: 'scale(1)', offset: 1 }
	]
} satisfies { duration: number; easing: string; keyframes: Keyframe[] };

// LI.FI is re-quoted at most this often for unchanged inputs, rather than on every periodic tick:
// its rate limit is tight, and a displayed quote is never signed — execution always re-quotes.
export const LIFI_QUOTE_REFRESH_INTERVAL_MS = 30_000;

// The swap form shows its offers once every provider has answered, so a stalled LI.FI request would
// hold back every other offer, and a request that never settles would never be retried.
export const LIFI_QUOTE_TIMEOUT_MS = 10_000;

export const NEAR_INTENTS_BLOCKCHAIN_MAP: Record<NetworkId, string> = {
	[ETHEREUM_NETWORK_ID]: 'eth',
	[ARBITRUM_MAINNET_NETWORK_ID]: 'arb',
	[BASE_NETWORK_ID]: 'base',
	[BSC_MAINNET_NETWORK_ID]: 'bsc',
	[POLYGON_MAINNET_NETWORK_ID]: 'pol',
	[ROBINHOOD_MAINNET_NETWORK_ID]: 'hood',
	[SOLANA_MAINNET_NETWORK_ID]: 'sol',
	[BTC_MAINNET_NETWORK_ID]: 'btc',
	[XRP_MAINNET_NETWORK_ID]: 'xrp'
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
		: {}),
	// Unconditional, unlike the flag-gated entries above: `ActiveUserTransactionItem`
	// resolves a row's provider name through this map, and an AUT row outlives a flag
	// rollback — a gated entry would leave historical rows nameless. `website` is the
	// docs page rather than an external venue, because this is the one in-house
	// provider, and it is where the Trading tab and deposit flow already point.
	[SwapProvider.OISY_TRADE]: {
		website: OISY_TRADE_LEARN_MORE_URL,
		name: OISY_TRADE_PROVIDER_NAME,
		logo: '/images/dapps/oisy-trade-logo.svg'
	},
	// Unconditional for the same reason as OISY Trade: a LI.FI active-transaction row outlives a
	// flag rollback, and `ActiveUserTransactionItem` will name it through this map once the LI.FI
	// tracking lands (PR 2b-3 of the spec).
	[SwapProvider.LIFI]: {
		website: 'https://li.fi',
		name: 'LI.FI',
		// TODO: replace the placeholder with the official logo
		logo: '/images/dapps/lifi-logo.svg'
	}
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

// Bitcoin reaches ICP through Chain Fusion: ck conversion is its route into the ICP
// side of the swap universe, and no DEX in the list quotes a BTC pair.
const CHAIN_FUSION_BTC_NETWORK_IDS: NetworkId[] = CHAIN_FUSION_SWAP_ENABLED
	? [BTC_MAINNET_NETWORK_ID]
	: [];

// NEAR Intents bridges BTC mainnet to and from every EVM and Solana chain in its map.
const NEAR_INTENTS_BTC_NETWORK_IDS: NetworkId[] = NEAR_INTENTS_BTC_SWAP_ENABLED
	? [BTC_MAINNET_NETWORK_ID]
	: [];

// NEAR Intents bridges XRP mainnet to and from every EVM, Solana and Bitcoin chain in its map, and
// is XRP's only provider.
const NEAR_INTENTS_XRP_NETWORK_IDS: NetworkId[] = NEAR_INTENTS_XRP_SWAP_ENABLED
	? [XRP_MAINNET_NETWORK_ID]
	: [];

const ICP_PAIRED_EVM_NETWORK_IDS: NetworkId[] = [
	...new Set<NetworkId>([
		...(ONESEC_SWAP_ENABLED ? ONESEC_EVM_NETWORK_IDS : []),
		...CHAIN_FUSION_EVM_NETWORK_IDS
	])
];

const withIcpIfPaired = (networkId: NetworkId): NetworkId[] => [
	...(ICP_PAIRED_EVM_NETWORK_IDS.includes(networkId) ? [ICP_NETWORK_ID] : []),
	...SUPPORTED_CROSS_SWAP_NETWORK_IDS,
	...NEAR_INTENTS_BTC_NETWORK_IDS,
	...NEAR_INTENTS_XRP_NETWORK_IDS
];

export const SUPPORTED_CROSS_SWAP_NETWORKS: Record<NetworkId, NetworkId[]> = {
	[ICP_NETWORK_ID]: [
		ICP_NETWORK_ID,
		...ICP_PAIRED_EVM_NETWORK_IDS,
		...CHAIN_FUSION_BTC_NETWORK_IDS
	],
	[BTC_MAINNET_NETWORK_ID]: [
		...(CHAIN_FUSION_BTC_NETWORK_IDS.length > 0 ? [ICP_NETWORK_ID] : []),
		...(NEAR_INTENTS_BTC_SWAP_ENABLED
			? [...SUPPORTED_CROSS_SWAP_NETWORK_IDS, ...NEAR_INTENTS_XRP_NETWORK_IDS]
			: [])
	],
	[ETHEREUM_NETWORK_ID]: withIcpIfPaired(ETHEREUM_NETWORK_ID),
	[ARBITRUM_MAINNET_NETWORK_ID]: withIcpIfPaired(ARBITRUM_MAINNET_NETWORK_ID),
	[BSC_MAINNET_NETWORK_ID]: withIcpIfPaired(BSC_MAINNET_NETWORK_ID),
	[POLYGON_MAINNET_NETWORK_ID]: withIcpIfPaired(POLYGON_MAINNET_NETWORK_ID),
	[BASE_NETWORK_ID]: withIcpIfPaired(BASE_NETWORK_ID),
	[ROBINHOOD_MAINNET_NETWORK_ID]: withIcpIfPaired(ROBINHOOD_MAINNET_NETWORK_ID),
	[SOLANA_MAINNET_NETWORK_ID]: [
		...SUPPORTED_CROSS_SWAP_NETWORK_IDS,
		...NEAR_INTENTS_BTC_NETWORK_IDS,
		...NEAR_INTENTS_XRP_NETWORK_IDS
	],
	// Absent rather than empty while the flag is off, so a lookup reads as it does without XRP.
	...(NEAR_INTENTS_XRP_SWAP_ENABLED
		? {
				[XRP_MAINNET_NETWORK_ID]: [
					...SUPPORTED_CROSS_SWAP_NETWORK_IDS,
					...NEAR_INTENTS_BTC_NETWORK_IDS
				]
			}
		: {})
};
