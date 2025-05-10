import { z } from 'zod';

export const AddressSchema = z.string();

export const SolAddressSchema = AddressSchema.brand('SolAddress');
