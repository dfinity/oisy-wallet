import { NetworkEnvironmentSchema, NetworkIdSchema } from '$lib/schema/network.schema';
import { UrlSchema } from '$lib/validation/url.validation';
import * as z from 'zod';

const BigIntStringSchema = z.string().regex(/^\d+$/, {
	message: 'Must be a non-negative integer string'
});

/**
 * Runtime representation of a user-added EVM network.
 *
 * Deliberately separate from `EthereumNetwork` (built-in chains) because custom
 * chains take a different code path: generic JSON-RPC provider, no Infura/Alchemy,
 * and no participation in features gated by those providers (NFT API, CoinGecko
 * pricing, onramp). The `Evm` naming reinforces that distinction at call sites.
 */
export const CustomEvmNetworkSchema = z.object({
	id: NetworkIdSchema,
	chainId: z.bigint().positive(),
	name: z.string().min(1),
	rpcUrl: UrlSchema,
	currencySymbol: z.string().min(1),
	explorerUrl: UrlSchema.optional(),
	iconUrl: UrlSchema.optional(),
	env: NetworkEnvironmentSchema
});

/**
 * Serialized representation persisted in localStorage.
 *
 * `NetworkId` is a branded `symbol` and cannot be JSON-serialized, so it is
 * dropped at write time and re-derived deterministically from `chainId` on read.
 * `chainId` is stored as a decimal string because `bigint` has no JSON form.
 */
export const PersistedCustomEvmNetworkSchema = z.object({
	chainId: BigIntStringSchema,
	name: z.string().min(1),
	rpcUrl: UrlSchema,
	currencySymbol: z.string().min(1),
	explorerUrl: UrlSchema.optional(),
	iconUrl: UrlSchema.optional(),
	env: NetworkEnvironmentSchema
});

export const PersistedCustomEvmNetworkListSchema = z.array(PersistedCustomEvmNetworkSchema);
