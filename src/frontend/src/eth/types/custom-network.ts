import type {
	CustomEvmNetworkSchema,
	PersistedCustomEvmNetworkSchema
} from '$eth/schema/custom-network.schema';
import type * as z from 'zod';

export type CustomEvmNetwork = z.infer<typeof CustomEvmNetworkSchema>;

export type PersistedCustomEvmNetwork = z.infer<typeof PersistedCustomEvmNetworkSchema>;
