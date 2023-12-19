import type { ETH_ADDRESS } from '$lib/types/address';

export interface IdbEthAddress {
	address: ETH_ADDRESS;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}
