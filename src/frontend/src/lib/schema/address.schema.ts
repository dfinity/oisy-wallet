import { z } from 'zod';

export const AddressSchema = z.string().nonempty();
