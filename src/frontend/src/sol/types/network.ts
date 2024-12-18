import { type SolNetworkSchema, SolRpcConnectionConfigSchema } from '$sol/schema/network.schema';
import { z } from 'zod';

export type SolNetwork = z.infer<typeof SolNetworkSchema>;

export type SolRpcConnectionConfig = z.infer<typeof SolRpcConnectionConfigSchema>;

export enum SolanaNetworks {
	MAINNET = 'mainnet',
	TESTNET = 'testnet',
	DEVNET = 'devnet',
	LOCAL = 'local'
}
