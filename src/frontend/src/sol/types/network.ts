import type { Network } from '$lib/types/network';
import {
	SolanaNetworkSchema,
	type SolRpcConnectionConfigSchema,
	type SolanaChainIdSchema
} from '$sol/schema/network.schema';
import type * as z from 'zod';

export type SolRpcConnectionConfig = z.infer<typeof SolRpcConnectionConfigSchema>;

export type SolanaNetworkType = z.infer<typeof SolanaNetworkSchema>;

export type SolanaChainId = z.infer<typeof SolanaChainIdSchema>;

export type SolanaNetwork = Network & SolanaChainId;

export const SolanaNetworks = SolanaNetworkSchema.enum;
