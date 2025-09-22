import type { CoingeckoPlatformId } from '$lib/types/coingecko';
import type { NetworkBuy } from '$lib/types/network';
import type { OnramperNetworkId } from '$lib/types/onramper';
import type { AtLeastOne } from '$lib/types/utils';
import { UrlSchema } from '$lib/validation/url.validation';
import * as z from 'zod/v4';

export const NetworkIdSchema = z.symbol().brand<'NetworkId'>();

export const NetworkEnvironmentSchema = z.enum(['mainnet', 'testnet']);

// TODO: use Zod to validate the CoingeckoPlatformId
export const NetworkExchangeSchema = z.object({
	coingeckoId: z.custom<CoingeckoPlatformId>().optional()
});

// TODO: use Zod to validate the OnramperNetworkId
export const NetworkBuySchema = z.object({
	onramperId: z.custom<OnramperNetworkId>().optional()
});

export const NetworkAppMetadataSchema = z.object({
	explorerUrl: UrlSchema
});

const IconSchema = z
	.string()
	.refine((value) => value.endsWith('.svg') || value.startsWith('data:image/svg+xml'), {
		message: 'Must be an SVG file'
	});

/**
 * Zod schema defining the shape of a network-like object.
 *
 * This schema represents both actual networks (e.g., the Internet Computer, Ethereum, Bitcoin mainnet)
 * and "pseudo-networks" used for development or simulation purposes. For example, the
 * `ICP_PSEUDO_TESTNET_NETWORK` mimics the structure of the IC network but is used to
 * isolate testnet tokens such as `ckSepoliaETH` from production data.
 *
 * This flexible schema supports both actual networks and internally defined groupings used
 * for development, testing, or UX separation.
 */
export const NetworkSchema = z.object({
	id: NetworkIdSchema,
	env: NetworkEnvironmentSchema,
	name: z.string(),
	iconLight: IconSchema.optional(),
	iconDark: IconSchema.optional(),
	iconTransparent: IconSchema.optional(),
	exchange: NetworkExchangeSchema.optional(),
	buy: z.custom<AtLeastOne<NetworkBuy>>().optional()
});
