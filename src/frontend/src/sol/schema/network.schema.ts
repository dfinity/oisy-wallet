import { NetworkSchema } from '$lib/schema/network.schema';
import { z } from 'zod';

export const SolNetworkSchema = z
	.object({
		rpcUrl: z.string()
	})
	.merge(NetworkSchema);
