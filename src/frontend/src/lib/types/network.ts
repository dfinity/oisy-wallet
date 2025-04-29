import {
	type NetworkAppMetadataSchema,
	type NetworkBuySchema,
	type NetworkEnvironmentSchema,
	type NetworkExchangeSchema,
	type NetworkIdSchema,
	type NetworkSchema
} from '$lib/schema/network.schema';
import type * as z from 'zod';

export type NetworkId = z.infer<typeof NetworkIdSchema>;

export type NetworkEnvironment = z.infer<typeof NetworkEnvironmentSchema>;

export type Network = z.infer<typeof NetworkSchema>;

export type NetworkExchange = z.infer<typeof NetworkExchangeSchema>;

export type NetworkBuy = z.infer<typeof NetworkBuySchema>;

export type NetworkAppMetadata = z.infer<typeof NetworkAppMetadataSchema>;
