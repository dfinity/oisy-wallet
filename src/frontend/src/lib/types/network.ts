import type { OnramperNetworkId } from '$lib/types/onramper';
import type { AtLeastOne } from '$lib/types/utils';
import { z } from 'zod';

export const NetworkIdSchema = z.symbol().brand<'NetworkId'>();

export type NetworkId = z.infer<typeof NetworkIdSchema>;

export type NetworkEnvironment = 'mainnet' | 'testnet';

export interface Network {
	id: NetworkId;
	env: NetworkEnvironment;
	name: string;
	icon?: string;
	iconBW?: string;
	buy?: AtLeastOne<NetworkBuy>;
}

export interface NetworkBuy {
	onramperId?: OnramperNetworkId;
}

export interface NetworkAppMetadata {
	explorerUrl: string;
}
