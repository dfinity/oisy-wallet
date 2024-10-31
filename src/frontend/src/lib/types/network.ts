import type { OnramperNetworkId } from '$lib/types/onramper';
import type { AtLeastOne } from '$lib/types/utils';
import { UrlSchema } from '$lib/validation/url.validation';
import { z } from 'zod';

export const NetworkIdSchema = z.symbol().brand<'NetworkId'>();

const NetworkEnvironmentSchema = z.enum(['mainnet', 'testnet']);

// TODO: use Zod to validate the OnramperNetworkId
const NetworkBuySchema = z.object({
	onramperId: z.custom<OnramperNetworkId>().optional()
});

const NetworkAppMetadataSchema = z.object({
	explorerUrl: UrlSchema
});

export type NetworkId = z.infer<typeof NetworkIdSchema>;

export type NetworkEnvironment = z.infer<typeof NetworkEnvironmentSchema>;

export interface Network {
	id: NetworkId;
	env: NetworkEnvironment;
	name: string;
	icon?: string;
	iconBW?: string;
	buy?: AtLeastOne<NetworkBuy>;
}

export type NetworkBuy = z.infer<typeof NetworkBuySchema>;

export type NetworkAppMetadata = z.infer<typeof NetworkAppMetadataSchema>;
