import { NetworkIdSchema, type NetworkId } from '$lib/types/network';

export const parseNetworkId = (networkIdString: string): NetworkId =>
	NetworkIdSchema.parse(Symbol(networkIdString));
