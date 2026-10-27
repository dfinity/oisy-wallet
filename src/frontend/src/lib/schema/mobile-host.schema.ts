import * as z from 'zod';

export const MobileRootSchema = z.enum(['wallet', 'activity', 'search', 'notes', 'earn', 'borrow']);
export const MobileNavigationSchema = z
	.object({
		version: z.literal(2),
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
export const MobileHandshakeSchema = z
	.object({
		version: z.literal(2),
		root: MobileRootSchema,
		mode: z.literal('audit-read-only'),
		runtimeId: z.string().uuid(),
		capabilities: z.array(z.enum(['nativeNavigation', 'account', 'delegation']))
	})
	.strict();
export type MobileRoot = z.infer<typeof MobileRootSchema>;

export type MobileScreen = z.infer<typeof MobileNavigationSchema>['root'];
export const MobileWalletRequestSchema = z.discriminatedUnion('method', [
	z.object({ method: z.literal('authorize'), publicKey: z.string().min(1).max(128) }).strict(),
	z
		.object({
			method: z.literal('account'),
			grantID: z.string().uuid(),
			principal: z.string().max(100),
			address: z.string().max(42).optional()
		})
		.strict(),
	z.object({ method: z.literal('sessionExpired') }).strict(),
	z.object({ method: z.literal('signOut') }).strict()
]);
export type MobileWalletRequest = z.infer<typeof MobileWalletRequestSchema>;
export const MobileWalletResponseSchema = z.object({ response: z.string().max(65_536) }).strict();
