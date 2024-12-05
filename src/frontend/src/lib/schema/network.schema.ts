import type { NetworkBuy } from '$lib/types/network';
import type { OnramperNetworkId } from '$lib/types/onramper';
import type { AtLeastOne } from '$lib/types/utils';
import { UrlSchema } from '$lib/validation/url.validation';
import { z } from 'zod';

export const NetworkIdSchema = z.symbol().brand<'NetworkId'>();

export const NetworkEnvironmentSchema = z.enum(['mainnet', 'testnet']);

// TODO: use Zod to validate the OnramperNetworkId
export const NetworkBuySchema = z.object({
	onramperId: z.custom<OnramperNetworkId>().optional()
});

export const NetworkAppMetadataSchema = z.object({
	explorerUrl: UrlSchema
});

const IconSchema = z
	.string()
	.refine((value) => value.endsWith('.svg'), { message: 'Must be an SVG file' });

export const NetworkSchema = z.object({
	id: NetworkIdSchema,
	env: NetworkEnvironmentSchema,
	name: z.string(),
	icon: IconSchema.optional(),
	iconBW: IconSchema.optional(),
	buy: z.custom<AtLeastOne<NetworkBuy>>().optional()
});
