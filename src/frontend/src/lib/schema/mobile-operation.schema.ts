import * as z from 'zod';

const amount = z.string().regex(/^\d{1,78}$/);
const principal = z.string().min(1).max(100);
const base = { id: z.string().uuid(), createdAt: z.number().int().nonnegative().safe() };
export const MobileIcpSwapOperationSchema = z
	.object({
		...base,
		kind: z.literal('icpSwap'),
		pool: principal,
		source: principal,
		destination: principal,
		sourceSymbol: z.string().min(1).max(32),
		destinationSymbol: z.string().min(1).max(32),
		amount,
		stage: z.enum(['approval', 'deposit', 'swap', 'withdraw', 'recovery', 'recovered']),
		updatedAt: z.number().int().nonnegative().safe()
	})
	.strict();
export const MobileOperationSchema = z.discriminatedUnion('kind', [
	z
		.object({
			...base,
			kind: z.literal('evmSend'),
			chainId: amount,
			from: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
			to: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
			symbol: z.string().min(1).max(32),
			hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
			nonce: z.number().int().nonnegative().safe()
		})
		.strict(),
	MobileIcpSwapOperationSchema
]);
export const MobileOperationsSchema = z.array(MobileOperationSchema).max(16);
export const MobileOperationJournalSchema = z
	.object({
		revision: z.union([z.literal(''), z.string().uuid()]),
		value: z.string().max(16_384)
	})
	.strict();
export type MobileOperation = z.infer<typeof MobileOperationSchema>;
export type MobileIcpSwapOperation = z.infer<typeof MobileIcpSwapOperationSchema>;
