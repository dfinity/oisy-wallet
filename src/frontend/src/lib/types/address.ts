import type { Option } from '$lib/types/utils';

export type Address = string;

export type BtcAddress = Address;

export type EthAddress = Address;

export type SolAddress = Address;

export type OptionAddress<T extends Address> = Option<T>;

export type OptionBtcAddress = OptionAddress<BtcAddress>;

export type OptionEthAddress = OptionAddress<EthAddress>;
