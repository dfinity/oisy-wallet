import { z } from 'zod';

export const AddressTypeSchema = z.enum(['BTC', 'ETH', 'SOL', 'ICP']);

export const AddressSchema = z.object({
	address_type: AddressTypeSchema,
	address: z.string(),
	label: z.string().optional(),
	is_default: z.string()
});

export const ContactSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	avatar: z.string().optional(),
	addresses: z.array(AddressSchema),
	notes: z.string().optional(),
	is_favorite: z.boolean().default(false),
	last_update: z.date()
});
