import { NetworkSchema } from '$lib/schema/network.schema';
import { UrlSchema } from '$lib/validation/url.validation';
import { z } from 'zod';

export const SolRpcConnectionConfigSchema = z.object({
	httpUrl: UrlSchema,
	wssUrl: UrlSchema
});

export const SolNetworkSchema = z
	.object({
		rpc: SolRpcConnectionConfigSchema
	})
	.merge(NetworkSchema);
