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
		sites: ExtensionSitesSchema
	}),
	version: z.string().optional()
});

export const ExtensionRequestMessageSchema = z.object({
	type: z.literal('request'),
	request: ExtensionRequestSchema.nullable(),
	// Versions before the handshake did not report one.
	version: z.string().optional()
});
