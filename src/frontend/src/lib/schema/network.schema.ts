import { CoingeckoPlatformIdSchema } from '$lib/schema/coingecko.schema';
import { OnramperNetworkIdSchema } from '$lib/schema/onramper.schema';
import { UrlSchema } from '$lib/validation/url.validation';
import * as z from 'zod';

export const NetworkIdSchema = z.symbol().brand<'NetworkId'>();

export const NetworkEnvironmentSchema = z.enum(['mainnet', 'testnet']);

export const NetworkExchangeSchema = z.object({
	coingeckoId: CoingeckoPlatformIdSchema.optional()
});

const NetworkBuySchema = z.object({
	onramperId: OnramperNetworkIdSchema
});

const NetworkPaySchema = z.object({
	openCryptoPay: z.string()
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
 * This schema represents both actual networks (e.g. the Internet Computer, Ethereum, Bitcoin mainnet)
 * and "pseudo-networks" used for development or simulation. For example, the
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
	icon: IconSchema.optional(),
	explorerUrl: UrlSchema,
	exchange: NetworkExchangeSchema.optional(),
	buy: NetworkBuySchema.optional(),
	pay: NetworkPaySchema.optional(),
	supportsNft: z.boolean().optional()
});
