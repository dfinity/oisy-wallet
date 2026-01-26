import type {
	NetworkEnvironmentSchema,
	NetworkExchangeSchema,
	NetworkIdSchema,
	NetworkSchema
} from '$lib/schema/network.schema';
import type { Option } from '$lib/types/utils';
import type * as z from 'zod';

export type NetworkId = z.infer<typeof NetworkIdSchema>;

export type NetworkEnvironment = z.infer<typeof NetworkEnvironmentSchema>;

export type Network = z.infer<typeof NetworkSchema>;

export type NetworkExchange = z.infer<typeof NetworkExchangeSchema>;

export type OptionNetworkId = Option<NetworkId>;
