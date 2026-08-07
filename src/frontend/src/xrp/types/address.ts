import type { OptionAddress } from '$lib/types/address';
import type { XrpAddressSchema } from '$xrp/schema/address.schema';
import type * as z from 'zod';

export type XrpAddress = z.infer<typeof XrpAddressSchema>;

export type OptionXrpAddress = OptionAddress<XrpAddress>;
