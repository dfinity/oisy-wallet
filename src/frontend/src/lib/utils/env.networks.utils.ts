import { LOCAL } from '$lib/constants/app.constants';
import type { Network } from '$lib/types/network';

export const defineSupportedNetworks = <T extends Network>({
	mainnetFlag,
	mainnetNetworks,
	testnetNetworks = [],
	localNetworks = []
}: {
	mainnetFlag: boolean;
	mainnetNetworks: T[];
	testnetNetworks?: T[];
	localNetworks?: T[];
}): T[] => [
	...(mainnetFlag ? mainnetNetworks : []),
	...testnetNetworks,
	...(LOCAL ? localNetworks : [])
];
