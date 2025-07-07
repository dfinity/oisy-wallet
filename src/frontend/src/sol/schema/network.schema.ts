import { UrlSchema } from '$lib/validation/url.validation';
import * as z from 'zod/v4';

export const SolRpcConnectionConfigSchema = z.object({
	httpUrl: UrlSchema,
	websocketUrl: UrlSchema
});

export const SOLANA_NETWORK_TYPES = ['mainnet', 'devnet', 'local'] as const;

export const SolanaNetworkSchema = z.enum(SOLANA_NETWORK_TYPES);

export const SolanaChainIdSchema = z.object({
	chainId: z.string().optional()
});
