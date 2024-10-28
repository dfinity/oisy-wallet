import type { OnramperNetworkId } from '$lib/types/onramper';
import type { AtLeastOne } from '$lib/types/utils';
import { z } from 'zod';

const NetworkIdSchema = z.symbol().brand<'NetworkId'>();

const NetworkEnvironmentSchema = z.enum(['mainnet', 'testnet']);

// TODO: use Zod to validate the OnramperNetworkId
const NetworkBuySchema = z.object({
	onramperId: z.custom<AtLeastOne<OnramperNetworkId>>().optional()
});

const NetworkAppMetadataSchema = z.object({
	explorerUrl: z.string()
});

export const NetworkSchema = z.object({
	id: NetworkIdSchema,
	env: NetworkEnvironmentSchema,
	name: z.string(),
	icon: z.string().optional(),
	iconBW: z.string().optional(),
	buy: NetworkBuySchema.optional()
});

export type NetworkId = z.infer<typeof NetworkIdSchema>;

export type NetworkEnvironment = z.infer<typeof NetworkEnvironmentSchema>;

export type Network = z.infer<typeof NetworkSchema>;

export type NetworkAppMetadata = z.infer<typeof NetworkAppMetadataSchema>;
