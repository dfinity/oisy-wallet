import type { OptionalNullable } from '$lib/types/utils';

export type Address = string;

export type BtcAddress = Address;

export type EthAddress = Address;

export type OptionAddress<T extends Address> = OptionalNullable<T>;

export type OptionBtcAddress = OptionAddress<BtcAddress>;

export type OptionEthAddress = OptionAddress<EthAddress>;
