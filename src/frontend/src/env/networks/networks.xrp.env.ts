import type { SchnorrKeyId } from '$declarations/signer/signer.did';
import { XRP_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import { SIGNER_ROOT_KEY_NAME } from '$env/signer.env';
import xrpMainnetIcon from '$lib/assets/networks/xrp-mainnet.svg';
import type { Network, NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import type { XrpNetwork } from '$xrp/types/network';

// XRP Ledger uses the same enablement convention as every other chain — the
// `VITE_XRP_MAINNET_DISABLED` env var, which defaults to *enabled*.
//
// TEMPORARY: while the integration is in progress this override force-disables XRP
// regardless of the env var, so the half-built chain never ships. Remove this override
// (and the `!… &&` below) in the final "enable" PR — XRP then behaves exactly like
// BTC/ETH/SOL. To test a build meanwhile, flip this to `false` on the branch; no
// deploy or CI env change is needed (XRP is then enabled by default like the others).
const XRP_MAINNET_DISABLED_OVERRIDE = true as boolean;

export const XRP_MAINNET_ENABLED =
	!XRP_MAINNET_DISABLED_OVERRIDE &&
	parseEnabledMainnetBoolEnvVar(import.meta.env.VITE_XRP_MAINNET_DISABLED);

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
