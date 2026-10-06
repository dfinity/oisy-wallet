import { XRP_MAINNET_ENABLED, XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { NetworkId } from '$lib/types/network';
import { defineEnabledNetworks } from '$lib/utils/networks.utils';
import type { XrpNetwork } from '$xrp/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledXrpNetworks: Readable<XrpNetwork[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: XRP_MAINNET_ENABLED,
			mainnetNetworks: [XRP_MAINNET_NETWORK]
		})
);

export const enabledXrpNetworksIds: Readable<NetworkId[]> = derived(
	[enabledXrpNetworks],
	([$xrpNetworks]) => $xrpNetworks.map(({ id }) => id)
);
