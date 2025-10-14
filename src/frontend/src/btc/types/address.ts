import type { BtcAddressSchema } from '$btc/schema/address.schema';
import type { OptionAddress } from '$lib/types/address';
import type * as z from 'zod';

export type BtcAddress = z.infer<typeof BtcAddressSchema>;

export type OptionBtcAddress = OptionAddress<BtcAddress>;
