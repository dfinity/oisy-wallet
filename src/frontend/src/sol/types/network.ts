import type { NetworkId } from '$lib/types/network';
import {
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdSOLTestnet
} from '$lib/utils/network.utils';
import { SolRpcConnectionConfigSchema } from '$sol/schema/network.schema';
import { z } from 'zod';

export type SolRpcConnectionConfig = z.infer<typeof SolRpcConnectionConfigSchema>;

export const SolanaNetworkSchema = z.enum(['mainnet', 'testnet', 'devnet', 'local']);

export type SolanaNetworkType = z.infer<typeof SolanaNetworkSchema>;

export const SolanaNetworks = SolanaNetworkSchema.enum;

export const mapNetworkIdToNetwork = (networkSymbol: NetworkId) => {
	if (isNetworkIdSOLMainnet(networkSymbol)) {
		return SolanaNetworks.mainnet;
	} else if (isNetworkIdSOLTestnet(networkSymbol)) {
		return SolanaNetworks.testnet;
	} else if (isNetworkIdSOLDevnet(networkSymbol)) {
		return SolanaNetworks.devnet;
	} else if (isNetworkIdSOLLocal(networkSymbol)) {
		return SolanaNetworks.local;
	} else {
		return undefined;
	}
};
