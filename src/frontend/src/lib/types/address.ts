import type { AddressSchema, BtcAddressSchema, SolAddressSchema } from '$lib/schema/address.schema';
import type { Option } from '$lib/types/utils';
import type * as z from 'zod';

export type Address = z.infer<typeof AddressSchema>;

export type BtcAddress = z.infer<typeof BtcAddressSchema>;

export type EthAddress = Address;

export type SolAddress = z.infer<typeof SolAddressSchema>;

export type OptionAddress<T extends Address> = Option<T>;

export type OptionBtcAddress = OptionAddress<BtcAddress>;

export type OptionEthAddress = OptionAddress<EthAddress>;

export type OptionSolAddress = OptionAddress<SolAddress>;
