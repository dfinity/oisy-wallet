import { LOCAL } from '$lib/constants/app.constants';
import type { Network } from '$lib/types/network';
import type { UserNetworks } from '$lib/types/user-networks';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';

export const defineEnabledNetworks = <T extends Network>({
	$testnetsEnabled,
	$userNetworks,
	mainnetFlag,
	mainnetNetworks,
	testnetNetworks = [],
	localNetworks = []
}: {
	$testnetsEnabled: boolean;
	$userNetworks: UserNetworks;
	mainnetFlag: boolean;
	mainnetNetworks: T[];
	testnetNetworks?: T[];
	localNetworks?: T[];
}): T[] =>
	[
		...(mainnetFlag ? mainnetNetworks : []),
		...($testnetsEnabled ? [...testnetNetworks, ...(LOCAL ? localNetworks : [])] : [])
	].filter(({ id: networkId }) => isUserNetworkEnabled({ userNetworks: $userNetworks, networkId }));
