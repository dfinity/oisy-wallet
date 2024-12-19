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
	}
	if (isNetworkIdSOLTestnet(networkSymbol)) {
		return SolanaNetworks.testnet;
	}
	if (isNetworkIdSOLDevnet(networkSymbol)) {
		return SolanaNetworks.devnet;
	}
	if (isNetworkIdSOLLocal(networkSymbol)) {
		return SolanaNetworks.local;
	}
	return undefined;
};
