import type { NetworkId } from '$lib/types/network';

interface UserNetworkSettings {
	enabled: boolean;
	isTestnet: boolean;
}

export type UserNetworks = Record<NetworkId, UserNetworkSettings>;
