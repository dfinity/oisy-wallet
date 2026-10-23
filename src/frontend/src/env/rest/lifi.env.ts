import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import type { EthAddress } from '$eth/types/address';
import { TEST } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';

// On in every environment. Off under test, whose specs switch it on themselves.
export const LIFI_SWAP_ENABLED = !TEST;

// Scoped to an origin allow-list on LI.FI's partner portal, with a separate key per environment, so
// shipping it in the bundle does not expose another environment's quota.
export const LIFI_API_KEY: string | undefined = import.meta.env.VITE_LIFI_API_KEY;

// The integrator id registered with LI.FI. The SDK refuses to create a client without one, so while
// it is unset LI.FI simply offers no quote.
export const LIFI_INTEGRATOR: string | undefined = import.meta.env.VITE_LIFI_INTEGRATOR;

const LIFI_DIAMOND = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';

/**
 * The LI.FI Diamond — the call target and ERC-20 spender of every LI.FI transaction — per network.
 *
 * Pinned from `deployments/<chain>.json` in https://github.com/lifinance/contracts and never taken
 * from a quote: a quote naming any other target or spender is refused. An EVM network without an
 * entry is one LI.FI is never asked about, on either side of a swap. Solana mainnet has no entry
 * and is still quoted, as a destination only: a Diamond is the call target of an EVM source.
 */
export const LIFI_DIAMOND_ADDRESSES: Partial<Record<NetworkId, EthAddress>> = {
	[ETHEREUM_NETWORK_ID]: LIFI_DIAMOND,
	[ARBITRUM_MAINNET_NETWORK_ID]: LIFI_DIAMOND,
	[BSC_MAINNET_NETWORK_ID]: LIFI_DIAMOND,
	[POLYGON_MAINNET_NETWORK_ID]: LIFI_DIAMOND,
	[BASE_NETWORK_ID]: LIFI_DIAMOND,
	[ROBINHOOD_MAINNET_NETWORK_ID]: '0xB477751B76CF82d00a686A1232f5fCD772414Af3'
};

/**
 * The bridges a cross-chain quote may use, per source network: LI.FI tool keys (`/v1/tools`) of the
 * facets whose receiver and refund fields the swap decodes and binds before signing. Not every
 * Diamond carries every facet — Robinhood Chain's has neither the NEAR Intents nor the Mayan one.
 *
 * Mayan is not listed yet: LI.FI serves it under four tool keys (`mayan`, `mayanWH`, `mayanMCTP`,
 * `mayanFastMCTP`), and a key is added only once its calldata is confirmed to go through the facet
 * the binding decodes.
 */
export const LIFI_ALLOWED_BRIDGES: Partial<Record<NetworkId, string[]>> = {
	[ETHEREUM_NETWORK_ID]: ['across', 'near'],
	[ARBITRUM_MAINNET_NETWORK_ID]: ['across', 'near'],
	[BSC_MAINNET_NETWORK_ID]: ['across', 'near'],
	[POLYGON_MAINNET_NETWORK_ID]: ['across', 'near'],
	[BASE_NETWORK_ID]: ['across', 'near'],
	[ROBINHOOD_MAINNET_NETWORK_ID]: ['across']
};

// Kept so that a misbehaving bridge or exchange can be blocked with a one-line change (LI.FI tool
// keys from `/v1/tools`). A denied bridge is dropped from `LIFI_ALLOWED_BRIDGES` before a quote is
// requested; a denied exchange is sent as `denyExchanges`.
export const LIFI_DENY_BRIDGES: string[] = [];
export const LIFI_DENY_EXCHANGES: string[] = [];
