import icpLight from '$lib/assets/icp_light.svg';
import type { Network } from '$lib/types/network';

export const ICP_NETWORK_SYMBOL = 'ICP';

export const ICP_NETWORK_ID = Symbol(ICP_NETWORK_SYMBOL);

export const ICP_NETWORK: Network = {
	id: ICP_NETWORK_ID,
	name: 'Internet Computer',
	icon: icpLight
};
