import { isSolAddress } from '$sol/utils/sol-address.utils';
import { z } from 'zod';

// TODO: Replace with TokenAccountIdType once merged:
//   https://github.com/dfinity/oisy-wallet/pull/6618/files#diff-340a0bdc6655d6830b6c3536c8787f8504f9103898d4e25fec81eca7a37227feR4
export const AddressTypeSchema = z.enum(['Icrc2', 'Btc', 'Eth', 'Sol']);

export const AddressSchema = z.string().nonempty();

export const SolAddressSchema = AddressSchema.refine((val) => isSolAddress(val));
