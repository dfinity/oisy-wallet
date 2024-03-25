export type NetworkId = symbol;

export type NetworkEnvironment = 'mainnet' | 'testnet';

export interface Network {
	id: NetworkId;
	env: NetworkEnvironment;
	name: string;
	icon?: string;
}
