import type { KaspaAddressSchema } from '$kaspa/schema/address.schema';
import type { OptionAddress } from '$lib/types/address';
import type * as z from 'zod';

export type KaspaAddress = z.infer<typeof KaspaAddressSchema>;

export type OptionKaspaAddress = OptionAddress<KaspaAddress>;
