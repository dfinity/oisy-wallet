import type { Network, NetworkAppMetadata } from '$lib/types/network';
import {
	type SolRpcConnectionConfigSchema,
	type SolanaChainIdSchema,
	SolanaNetworkSchema
} from '$sol/schema/network.schema';
import type * as z from 'zod';

export type SolRpcConnectionConfig = z.infer<typeof SolRpcConnectionConfigSchema>;

export type SolanaNetworkType = z.infer<typeof SolanaNetworkSchema>;

export type SolanaChainId = z.infer<typeof SolanaChainIdSchema>;

export type SolanaNetwork = Network & Partial<NetworkAppMetadata> & SolanaChainId;

export const SolanaNetworks = SolanaNetworkSchema.enum;
