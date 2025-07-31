import { SolAddressSchema } from '$lib/schema/address.schema';
import type { SolAddress } from '$lib/types/address';
import * as z from 'zod';

const AddressStringSchema = z.string();

export const parseSolAddress = (addressString: z.infer<typeof AddressStringSchema>): SolAddress => {
	const validString = AddressStringSchema.parse(addressString);
	return SolAddressSchema.parse(validString);
};
