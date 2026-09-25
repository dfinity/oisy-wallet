import { NetworkEnvironmentSchema, NetworkIdSchema } from '$lib/schema/network.schema';
import { UrlSchema } from '$lib/validation/url.validation';
import { createUrlSchema } from '@dfinity/zod-schemas';
import * as z from 'zod';

const BigIntStringSchema = z.string().regex(/^[1-9]\d*$/, {
	message: 'Must be a positive integer string'
});

/**
 * URL schema for JSON-RPC endpoints.
 *
 * The generic `UrlSchema` permits `ipfs:` because it doubles as the validator
 * for asset URLs (icons, metadata). That is not valid for an RPC endpoint,
 * which must speak HTTPS or secure WebSocket. Plain `http:` and `ws:` are
 * rejected in line with the existing `allowHttpLocally: false` stance on the
 * generic schema — we do not accept unencrypted remote endpoints even in dev.
 */
const RpcUrlSchema = createUrlSchema({
	additionalProtocols: ['wss:'],
	allowHttpLocally: false
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
	rpcUrl: RpcUrlSchema,
	currencySymbol: z.string().min(1),
	explorerUrl: UrlSchema.optional(),
	iconUrl: UrlSchema.optional(),
	env: NetworkEnvironmentSchema
});

/**
 * Input shape for `customEvmNetworksStore.add`: the full network minus the
 * derived `NetworkId`. Validated before the id is computed so that invalid
 * inputs don't populate the module-level `networkIdCache`.
 */
export const CustomEvmNetworkInputSchema = CustomEvmNetworkSchema.omit({ id: true });

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
	rpcUrl: RpcUrlSchema,
	currencySymbol: z.string().min(1),
	explorerUrl: UrlSchema.optional(),
	iconUrl: UrlSchema.optional(),
	env: NetworkEnvironmentSchema
});

export const PersistedCustomEvmNetworkListSchema = z.array(PersistedCustomEvmNetworkSchema);
