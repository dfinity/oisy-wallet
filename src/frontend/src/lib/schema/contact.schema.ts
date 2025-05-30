import { AddressSchema } from '$lib/schema/address.schema';
import { TokenAccountIdTypesSchema } from '$lib/schema/token-account-id.schema';
import * as z from 'zod';

export const ContactAddressUiSchema = z.object({
	address: AddressSchema,
	label: z.string().max(50).optional(),
	addressType: TokenAccountIdTypesSchema
});

export type ContactAddressUiSchemaType = z.infer<typeof ContactAddressUiSchema>;
