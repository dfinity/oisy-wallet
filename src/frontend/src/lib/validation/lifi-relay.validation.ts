import * as z from 'zod';

// A Relay request or order id: 32 bytes, hex.
const RelayIdSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

const AmountSchema = z.string().regex(/^\d{1,78}$/);

/**
 * LI.FI's copy of Relay's own quote, which a Relay route's `estimate.toolData` carries (2026-11-17):
 * the request Relay opened, the order its memo names and what it pays out. Only the fields the BTC
 * payout binding reads; LI.FI's answer is unsigned, so each is checked against the transaction and
 * the review, never taken on trust.
 */
export const LifiRelayToolDataSchema = z.object({
	steps: z.array(z.object({ requestId: RelayIdSchema })).min(1),
	details: z.object({
		currencyOut: z.object({
			currency: z.object({ chainId: z.number().int(), address: z.string().min(1) }),
			minimumAmount: AmountSchema
		})
	}),
	protocol: z.object({
		v2: z.object({
			orderId: RelayIdSchema,
			paymentDetails: z.object({
				chainId: z.literal('bitcoin'),
				amount: AmountSchema,
				depository: z.string().min(1)
			})
		})
	})
});

export type LifiRelayToolData = z.infer<typeof LifiRelayToolDataSchema>;
