import type { SchnorrKeyId } from '$declarations/signer/signer.did';
import { XRP_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import { SIGNER_ROOT_KEY_NAME } from '$env/signer.env';
import xrpMainnetIcon from '$lib/assets/networks/xrp-mainnet.svg';
import { BETA, PROD, TEST } from '$lib/constants/app.constants';
import type { Network, NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import type { XrpNetwork } from '$xrp/types/network';

// XRP Ledger uses the same enablement convention as every other chain — the
// `VITE_XRP_MAINNET_DISABLED` env var, which defaults to *enabled*.
//
// TEMPORARY: while the integration is in progress this override force-disables XRP on
// the user-facing environments (prod `ic` and beta) regardless of the env var, so the
// half-built chain never ships there, while leaving it enabled on real local and
// staging/test_fe builds so it can be exercised. `TEST` is included so the vitest suite
// keeps evaluating XRP as disabled — the unit-test env runs as `local`, and enabling XRP
// there would surface it in suite-wide network/token expectations that only get updated
// in the final "enable" PR. Remove this override (and the `!… &&` below) in that PR —
// XRP then behaves exactly like BTC/ETH/SOL.
const XRP_MAINNET_DISABLED_OVERRIDE = PROD || BETA || TEST;

export const XRP_MAINNET_ENABLED =
	!XRP_MAINNET_DISABLED_OVERRIDE &&
	parseEnabledMainnetBoolEnvVar(import.meta.env.VITE_XRP_MAINNET_DISABLED);

/**
 * XRPL JSON-RPC endpoint.
 *
 * Set `VITE_XRP_RPC_URL_MAINNET` to a managed provider endpoint (e.g. a QuickNode
 * XRPL cluster) before enabling XRP mainnet. The public XRP Ledger Foundation
 * cluster is used only as a development fallback — per xrpl.org it is not for
 * sustained or production use.
 */
export const XRP_RPC_HTTP_URL_MAINNET =
	import.meta.env.VITE_XRP_RPC_URL_MAINNET ?? 'https://xrplcluster.com';

export const XRP_MAINNET_NETWORK_SYMBOL = 'XRP';

export const XRP_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(XRP_MAINNET_NETWORK_SYMBOL);

export const XRP_MAINNET_NETWORK: XrpNetwork = {
	id: XRP_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'XRP Ledger',
	icon: xrpMainnetIcon,
	explorerUrl: XRP_MAINNET_EXPLORER_URL
};

export const SUPPORTED_XRP_NETWORKS: Network[] = defineSupportedNetworks({
	mainnetFlag: XRP_MAINNET_ENABLED,
	mainnetNetworks: [XRP_MAINNET_NETWORK]
});

export const SUPPORTED_XRP_NETWORK_IDS: NetworkId[] = SUPPORTED_XRP_NETWORKS.map(({ id }) => id);

export const XRP_KEY_ID: SchnorrKeyId = {
	algorithm: { ed25519: null },
	name: SIGNER_ROOT_KEY_NAME
};
