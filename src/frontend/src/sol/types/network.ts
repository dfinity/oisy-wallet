import type { Network, NetworkAppMetadata } from '$lib/types/network';
import { SolRpcConnectionConfigSchema, SolanaNetworkSchema } from '$sol/schema/network.schema';
import { z } from 'zod';

export type SolRpcConnectionConfig = z.infer<typeof SolRpcConnectionConfigSchema>;

export type SolanaNetworkType = z.infer<typeof SolanaNetworkSchema>;

export type SolanaNetwork = Network & Partial<NetworkAppMetadata>;

export const SolanaNetworks = SolanaNetworkSchema.enum;
