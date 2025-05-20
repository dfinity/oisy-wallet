import { isSolAddress } from '$sol/utils/sol-address.utils';
import { z } from 'zod';

export const AddressSchema = z.string().nonempty();

export const SolAddressSchema = AddressSchema.refine((val) => isSolAddress(val));
