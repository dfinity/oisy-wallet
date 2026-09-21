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
 * sustained or production use — so it is offered ONLY on non-user-facing builds.
 * User-facing builds (`ic`/`beta`) resolve to `undefined` when no managed URL is
 * configured; `xrpHttpRpcUrl` then throws rather than silently hitting the public cluster.
 *
 * `TEST` resolves to `undefined` unconditionally, and that is why it is checked FIRST rather than
 * sharing the fallback arm: a spec that forgets to mock an RPC call would otherwise reach a real
 * endpoint and pass, making the suite network-dependent and the omission invisible. Folded into
 * the `??` fallback it did not hold — a configured `VITE_XRP_RPC_URL_MAINNET` resolves before the
 * fallback is ever evaluated, so a developer with that variable in their local env got a live
 * provider from a forgotten mock, which is the one thing this is here to prevent. Any spec that
 * needs an endpoint mocks the module.
 */
export const XRP_RPC_HTTP_URL_MAINNET = TEST
	? undefined
	: (import.meta.env.VITE_XRP_RPC_URL_MAINNET ??
		(PROD || BETA ? undefined : 'https://xrplcluster.com'));

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
