import * as z from 'zod';

// Every request asks for `format: "raw"`: amounts are base-unit integers and assets canonical ids. A
// response in any other format is not one OISY asked for, and its amounts would mean something else.
const RiftRawFormatSchema = z.literal('raw');

const RiftBaseUnitsSchema = z.string().regex(/^\d+$/);

// Rift's quote and order ids are UUIDs.
const RiftIdSchema = z
	.string()
	.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const RiftVenueStepSchema = z.object({
	type: z.literal('venue'),
	// Not an enum: Rift adds venues, and a new one must not make a quote unreadable.
	venue: z.string(),
	from: z.string(),
	to: z.string(),
	amount_in: RiftBaseUnitsSchema,
	amount_out: RiftBaseUnitsSchema
});

const RiftDeliveryStepSchema = z.object({
	type: z.literal('delivery'),
	amount_in: RiftBaseUnitsSchema,
	execution_cost: RiftBaseUnitsSchema,
	integrator_fee: RiftBaseUnitsSchema,
	amount_out: RiftBaseUnitsSchema
});

export const RiftQuoteSchema = z.object({
	format: RiftRawFormatSchema,
	id: RiftIdSchema,
	from: z.string(),
	to: z.string(),
	amount_in: RiftBaseUnitsSchema,
	estimated_amount_out: RiftBaseUnitsSchema,
	estimated_execution_cost: RiftBaseUnitsSchema,
	route: z.array(z.discriminatedUnion('type', [RiftVenueStepSchema, RiftDeliveryStepSchema])),
	expires_at: z.iso.datetime(),
	integrator_fee_bps: z.number().int().nullish(),
	integrator_id: z.string().nullish()
});

export const RiftOrderStatusSchema = z.enum([
	'awaiting_deposit',
	'funded',
	'underfunded',
	'expired',
	'executing',
	'delivered',
	'refunded',
	'frozen'
]);

export const RiftOrderSchema = z.object({
	// Inherited from the quote the order was created from.
	format: RiftRawFormatSchema,
	id: RiftIdSchema,
	quote_id: RiftIdSchema,
	from: z.string(),
	to: z.string(),
	amount_in: RiftBaseUnitsSchema,
	// The amount of `to` delivered, or of `from` refunded; absent until the order settles.
	amount_out: RiftBaseUnitsSchema.nullish(),
	deposit_address: z.string(),
	deposit_tx: z.string().nullish(),
	payout_tx: z.string().nullish(),
	to_address: z.string(),
	refund_address: z.string().nullish(),
	integrator_fee: RiftBaseUnitsSchema.nullish(),
	status: RiftOrderStatusSchema,
	deposit_deadline: z.iso.datetime(),
	created_at: z.iso.datetime()
});

export const RiftErrorSchema = z.object({
	error: z.string()
});
