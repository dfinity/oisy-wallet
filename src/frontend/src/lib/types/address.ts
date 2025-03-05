import { SolAddressSchema, type AddressSchema } from '$lib/schema/address.schema';
import type { Option } from '$lib/types/utils';
import { z } from 'zod';

export type Address = z.infer<typeof AddressSchema>;

// TODO: create own brand for BTC address
export type BtcAddress = Address;

// TODO: create own brand for ETH address
export type EthAddress = Address;

export type SolAddress = z.infer<typeof SolAddressSchema>;

export type OptionAddress<T extends Address> = Option<T>;

export type OptionBtcAddress = OptionAddress<BtcAddress>;

export type OptionEthAddress = OptionAddress<EthAddress>;

export type OptionSolAddress = OptionAddress<SolAddress>;
