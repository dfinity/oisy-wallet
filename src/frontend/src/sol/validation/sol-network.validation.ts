import type { Network } from '$lib/types/network';
import { SolNetworkSchema } from '$sol/schema/network.schema';
import type { SolNetwork } from '$sol/types/network';

export const isSolNetwork = (network: Network): network is SolNetwork => {
	const { success } = SolNetworkSchema.safeParse(network);
	return success;
};
