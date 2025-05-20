import { z } from 'zod';

export const AddressSchema = z.string().nonempty();

// TODO: This is a best guess based on https://github.com/dfinity/oisy-wallet/pull/5815
//       Add final enum here in OISY-1262
export const AddressTypeSchema = z.enum(['Icrc2', 'Btc', 'Eth', 'Sol']);
