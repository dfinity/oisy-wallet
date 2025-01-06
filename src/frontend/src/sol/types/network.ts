import { SolanaNetworkSchema, SolRpcConnectionConfigSchema } from '$sol/schema/network.schema';
import { z } from 'zod';

export type SolRpcConnectionConfig = z.infer<typeof SolRpcConnectionConfigSchema>;

export type SolanaNetworkType = z.infer<typeof SolanaNetworkSchema>;

export const SolanaNetworks = SolanaNetworkSchema.enum;
