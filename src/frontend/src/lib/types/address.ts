import type { AddressSchema } from '$lib/schema/address.schema';
import type { Nullish } from '@dfinity/zod-schemas';
import type * as z from 'zod';

export type Address = z.infer<typeof AddressSchema>;

export type OptionAddress<T extends Address> = Nullish<T>;
