import type { OptionAddress } from '$lib/types/address';
import type { SolAddressSchema } from '$sol/schema/address.schema';
import type * as z from 'zod';

export type SolAddress = z.infer<typeof SolAddressSchema>;

export type OptionSolAddress = OptionAddress<SolAddress>;
