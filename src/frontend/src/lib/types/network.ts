import type { OnRamperNetworkId } from '$lib/types/onramper';
import type { AtLeastOne } from '$lib/types/utils';

export type NetworkId = symbol;

export type NetworkEnvironment = 'mainnet' | 'testnet';

export type Network = {
	id: NetworkId;
	env: NetworkEnvironment;
	name: string;
	icon?: string;
	buy?: AtLeastOne<NetworkBuy>;
};

export type NetworkBuy = {
	onRamperId?: OnRamperNetworkId;
};
