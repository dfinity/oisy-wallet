import { Currency } from '$lib/enums/currency';
import * as z from 'zod';

export const ExtensionChainSchema = z.enum(['eth', 'sol']);

const ExtensionRequestIdSchema = z.object({
	id: z.string()
});

export const ExtensionPairRequestSchema = ExtensionRequestIdSchema.extend({
	kind: z.literal('pair')
});

export const ExtensionConnectRequestSchema = ExtensionRequestIdSchema.extend({
	kind: z.literal('connect'),
	chain: ExtensionChainSchema,
	origin: z.string()
});

export const ExtensionSignRequestSchema = ExtensionRequestIdSchema.extend({
	kind: z.literal('sign'),
	chain: ExtensionChainSchema,
	origin: z.string(),
	method: z.string(),
	params: z.unknown(),
	// The address the site was connected with. The popup refuses to sign with any other account.
	address: z.string()
});

export const ExtensionRequestSchema = z.discriminatedUnion('kind', [
	ExtensionPairRequestSchema,
	ExtensionConnectRequestSchema,
	ExtensionSignRequestSchema
]);

// Which chains each connected site may see, keyed by the site's origin.
export const ExtensionSitesSchema = z.record(
	z.string(),
	z.object({ eth: z.boolean(), sol: z.boolean() })
);

export const ExtensionPanelStateMessageSchema = z.object({
	type: z.literal('state'),
	state: z.object({
		account: z.object({ eth: z.string(), sol: z.string() }).nullable(),
		sites: ExtensionSitesSchema,
		// Logged out from the panel: sites see no account until OISY hands the account back.
		locked: z.boolean().optional(),
		// The site in the active tab, or null where the extension does not run.
		activeOrigin: z.string().nullable().optional()
	}),
	version: z.string().optional()
});

export const ExtensionRequestMessageSchema = z.object({
	type: z.literal('request'),
	request: ExtensionRequestSchema.nullable(),
	// Versions before the handshake did not report one.
	version: z.string().optional()
});

// One row of the side panel's assets as last shown: a token or a group of the same token across
// networks. Networks are kept by id and looked up again when the snapshot is shown.
export const ExtensionPanelSnapshotRowSchema = z.object({
	name: z.string(),
	symbol: z.string(),
	decimals: z.number(),
	icon: z.string().optional(),
	oisyName: z.object({ prefix: z.string().optional(), oisyName: z.string() }).optional(),
	oisySymbol: z.object({ oisySymbol: z.string() }).optional(),
	balance: z.bigint().nullable().optional(),
	usdBalance: z.number().optional(),
	usdPrice: z.number().optional(),
	usdPriceChangePercentage24h: z.number().optional(),
	networkId: z.string().optional(),
	groupNetworkIds: z.array(z.string()).optional()
});

// What the side panel last showed while signed in, so it can still show the balances once the
// session has ended.
export const ExtensionPanelSnapshotSchema = z.object({
	savedAt: z.number(),
	usdTotal: z.number(),
	currency: z.enum(Currency),
	exchangeRateToUsd: z.number(),
	rows: z.array(ExtensionPanelSnapshotRowSchema)
});
