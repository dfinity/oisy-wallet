import { AddressSchema } from '$lib/schema/address.schema';
import { isSolAddress } from '$sol/utils/sol-address.utils';

export const SolAddressSchema = AddressSchema.refine((val) => isSolAddress(val));
