import type { OnRamperNetworkId } from '$lib/types/onramper';

export type NetworkId = symbol;

export type NetworkEnvironment = 'mainnet' | 'testnet';

export type Network = {
	id: NetworkId;
	env: NetworkEnvironment;
	name: string;
	icon?: string;
} & NetworkLinkedData;

export interface NetworkLinkedData {
	onRamperId?: OnRamperNetworkId;
}
