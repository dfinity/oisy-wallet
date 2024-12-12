import { NetworkSchema } from '$lib/schema/network.schema';
import { UrlSchema } from '$lib/validation/url.validation';
import { z } from 'zod';

export const SolNetworkSchema = z
	.object({
		rpcUrl: UrlSchema
	})
	.merge(NetworkSchema);
