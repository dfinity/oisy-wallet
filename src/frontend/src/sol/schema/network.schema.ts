import { UrlSchema } from '$lib/validation/url.validation';
import { z } from 'zod';

export const SolRpcConnectionConfigSchema = z.object({
	httpUrl: UrlSchema
});

export const SolanaNetworkSchema = z.enum(['mainnet', 'testnet', 'devnet', 'local']);
