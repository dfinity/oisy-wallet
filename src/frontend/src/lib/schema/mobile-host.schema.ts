import * as z from 'zod';

export const MobileRootSchema = z.enum(['wallet', 'activity', 'search', 'notes', 'earn', 'borrow']);
export const MobileNavigationSchema = z
	.object({
		version: z.literal(2),
		documentId: z.string().uuid(),
		requestId: z.number().int().nonnegative().safe().optional(),
		root: z.enum([
			'wallet',
			'activity',
			'search',
			'contacts',
			'preferences',
			'notes',
			'earn',
			'borrow'
		])
	})
	.strict();
export const MobileHandshakeSchema = z.object({
	version: z.literal(2),
	root: MobileRootSchema,
	requestId: z.number().int().nonnegative().safe().optional(),
	mode: z.literal('audit-read-only'),
	runtimeId: z.string().uuid(),
	documentId: z.string().uuid(),
	hostVersion: z.string().min(1).max(64),
	environment: z.literal('audit'),
	// Optional capabilities may be added independently. Command payloads stay strict.
	capabilities: z
		.array(
			z
				.string()
				.min(1)
				.max(64)
				.regex(/^[a-zA-Z][a-zA-Z0-9]*$/)
		)
		.max(32)
});
// No arbitrary destination URLs: this is the recorded list parent of a token.
const MobileListParentSchema = z
	.string()
	.max(2048)
	.refine((path) => {
		try {
			const url = new URL(path, 'capacitor://localhost');
			return (
				path.startsWith('/') &&
				!path.startsWith('//') &&
				url.hostname === 'localhost' &&
				url.pathname === '/' &&
				!url.hash &&
				new Set(url.searchParams.keys()).size === [...url.searchParams.keys()].length &&
				[...url.searchParams.entries()].every(([key, value]) =>
					key === 'search'
						? value === 'true'
						: key === 'network' && value.length > 0 && value.length <= 256
				)
			);
		} catch {
			return false;
		}
	});
const matchingListParent = ({ root, backPath }: { root: string; backPath?: string }): boolean => {
	if (!backPath) {
		return true;
	}
	try {
		return (
			(root === 'wallet' || root === 'search') &&
			new URL(backPath, 'capacitor://localhost').searchParams.has('search') === (root === 'search')
		);
	} catch {
		return false;
	}
};
export const MobileNavigationStateSchema = z
	.object({
		version: z.literal(2),
		root: MobileRootSchema,
		requestId: z.number().int().nonnegative().safe(),
		revision: z.number().int().nonnegative().safe(),
		backPath: MobileListParentSchema.optional()
	})
	.strict()
	.refine(matchingListParent);
export const MobileBackPreparationSchema = z
	.object({
		version: z.literal(2),
		root: z.enum(['wallet', 'search']),
		backPath: MobileListParentSchema
	})
	.strict()
	.refine(matchingListParent);
export const MobileBackEventSchema = z
	.object({ version: z.literal(2), documentId: z.string().uuid() })
	.strict();
export const MobileRefreshSchema = z
	.object({
		version: z.literal(2),
		requestId: z.number().int().nonnegative().safe()
	})
	.strict();

export const MobileRefreshEventSchema = MobileRefreshSchema.extend({
	documentId: z.string().uuid()
});

export type MobileNavigationState = z.infer<typeof MobileNavigationStateSchema>;
export interface MobileNavigationRequest {
	screen: MobileScreen;
	requestId: number;
}
export type MobileRoot = z.infer<typeof MobileRootSchema>;

export type MobileScreen = z.infer<typeof MobileNavigationSchema>['root'];
export const MobileWalletRequestSchema = z.discriminatedUnion('method', [
	z.object({ method: z.literal('authorize'), publicKey: z.string().min(1).max(684) }).strict(),
	z
		.object({
			method: z.literal('account'),
			grantID: z.string().uuid(),
			principal: z.string().max(100),
			address: z.string().max(42).optional()
		})
		.strict(),
	z.object({ method: z.literal('sessionExpired') }).strict(),
	z.object({ method: z.literal('signOut') }).strict(),
	z.object({ method: z.literal('readOperations') }).strict(),
	z
		.object({
			method: z.literal('writeOperations'),
			revision: z.union([z.literal(''), z.string().uuid()]),
			value: z.string().max(16_384)
		})
		.strict()
]);
export type MobileWalletRequest = z.infer<typeof MobileWalletRequestSchema>;
export const MobileWalletResponseSchema = z.object({ response: z.string().max(65_536) }).strict();
