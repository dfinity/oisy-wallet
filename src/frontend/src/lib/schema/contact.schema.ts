import { CONTACT_MAX_LABEL_LENGTH } from '$lib/constants/app.constants';
import { AddressSchema } from '$lib/schema/address.schema';
import { TokenAccountIdTypesSchema } from '$lib/schema/token-account-id.schema';
import * as z from 'zod/v4';

export const ContactAddressUiSchema = z.object({
	address: AddressSchema,
	label: z.string().max(CONTACT_MAX_LABEL_LENGTH).optional(),
	addressType: TokenAccountIdTypesSchema
});

export type ContactAddressUiSchemaType = z.infer<typeof ContactAddressUiSchema>;
