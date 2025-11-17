import type { AddressSchema } from '$lib/schema/address.schema';
import type { Option } from '$lib/types/utils';
import type * as z from 'zod';

export type Address = z.infer<typeof AddressSchema>;

export type OptionAddress<T extends Address> = Option<T>;
