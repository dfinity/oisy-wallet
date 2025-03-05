import { type AddressSchema } from '$lib/schema/address.schema';
import type { Option } from '$lib/types/utils';
import { z } from 'zod';

export type Address = z.infer<typeof AddressSchema>;

// TODO: create own brand for BTC address
export type BtcAddress = Address;

// TODO: create own brand for ETH address
export type EthAddress = Address;

// TODO: create own brand for SOL address
export type SolAddress = Address;

export type OptionAddress<T extends Address> = Option<T>;

export type OptionBtcAddress = OptionAddress<BtcAddress>;

export type OptionEthAddress = OptionAddress<EthAddress>;

export type OptionSolAddress = OptionAddress<SolAddress>;
