import type { SolNetworkSchema } from '$sol/schema/network.schema';
import { z } from 'zod';

export type SolNetwork = z.infer<typeof SolNetworkSchema>;

export enum SolanaNetworks {
	MAIN_NET = 'mainnet',
	TEST_NET = 'testnet',
	DEV_NET = 'devnet',
	LOCAL = 'local'
}
