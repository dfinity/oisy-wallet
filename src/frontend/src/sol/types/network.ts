import { SolRpcConnectionConfigSchema } from '$sol/schema/network.schema';
import { z } from 'zod';

export type SolRpcConnectionConfig = z.infer<typeof SolRpcConnectionConfigSchema>;

export const SolanaNetworkSchema = z.enum(['mainnet', 'testnet', 'devnet', 'local']);

export type SolanaNetworkType = z.infer<typeof SolanaNetworkSchema>;

export const SolanaNetworks = SolanaNetworkSchema.enum;
