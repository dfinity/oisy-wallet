import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { LOCAL, STAGING } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';
import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

// Feature flag: Rift quotes and orders new swaps. Production waits for the no-slippage form redesign,
// a production API key and CORS confirmed from OISY's origin. Rows that exist are polled and shown
// whatever it says.
export const RIFT_SWAP_ENABLED = LOCAL || STAGING;

export const RIFT_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://api.rift.trade'
});

// One key per environment, shipped in the bundle as LI.FI's is. Unset means keyless, which Rift limits
// to one request per second; `rift.rest.ts` paces every request to that either way.
export const RIFT_API_KEY: string | undefined = import.meta.env.VITE_RIFT_API_KEY;

// Sent with every quote so that Rift attributes OISY's orders. With an API key, the key's own
// integrator id takes its place.
export const RIFT_INTEGRATOR_ID = 'oisy';

// Rift's canonical id of native BTC on mainnet, as a `format: "raw"` quote writes it.
export const RIFT_BTC_ASSET_ID = 'bitcoin.btc';

/**
 * Rift's name for the native coin of each EVM network Rift is asked about. Its asset id is
 * `evm:<chainId>.<name>`, an ERC-20's `evm:<chainId>.<contract address>`.
 *
 * Pinned from live `format: "raw"` quotes (2026-11-26): Rift echoes these ids as written, and
 * rewrites any other spelling into them (`ethereum.eth` into `evm:1.eth`). Polygon's coin is `pol`;
 * `matic` is refused as an unknown asset. An EVM network without an entry is never asked about.
 */
export const RIFT_EVM_NATIVE_ASSETS: Partial<Record<NetworkId, string>> = {
	[ETHEREUM_NETWORK_ID]: 'eth',
	[ARBITRUM_MAINNET_NETWORK_ID]: 'eth',
	[BASE_NETWORK_ID]: 'eth',
	[POLYGON_MAINNET_NETWORK_ID]: 'pol',
	[ROBINHOOD_MAINNET_NETWORK_ID]: 'eth'
};
