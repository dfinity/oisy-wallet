import type {
	NetworkAppMetadataSchema,
	NetworkBuySchema,
	NetworkEnvironmentSchema,
	NetworkExchangeSchema,
	NetworkIdSchema,
	NetworkSchema
} from '$lib/schema/network.schema';
import type * as z from 'zod/v4';
import type { Option } from '$lib/types/utils';

export type NetworkId = z.infer<typeof NetworkIdSchema>;

export type NetworkEnvironment = z.infer<typeof NetworkEnvironmentSchema>;

export type Network = z.infer<typeof NetworkSchema>;

export type NetworkExchange = z.infer<typeof NetworkExchangeSchema>;

export type NetworkBuy = z.infer<typeof NetworkBuySchema>;

export type NetworkAppMetadata = z.infer<typeof NetworkAppMetadataSchema>;

export type OptionNetworkId = Option<NetworkId>;
