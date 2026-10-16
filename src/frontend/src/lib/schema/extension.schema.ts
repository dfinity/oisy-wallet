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

export const ExtensionRequestMessageSchema = z.object({
	type: z.literal('request'),
	request: ExtensionRequestSchema.nullable()
});
