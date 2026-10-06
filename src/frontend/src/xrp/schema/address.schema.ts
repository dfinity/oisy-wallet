import { AddressSchema } from '$lib/schema/address.schema';
import { isXrpAddress } from '$xrp/utils/xrp-address.utils';

export const XrpAddressSchema = AddressSchema.refine((val) => isXrpAddress(val));
