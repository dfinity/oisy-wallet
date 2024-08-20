export type Address = string;

export type BtcAddress = Address;

export type EthAddress = Address;

export type OptionAddress<T extends Address> = T | undefined | null;

export type OptionBtcAddress = OptionAddress<BtcAddress>;

export type OptionEthAddress = OptionAddress<EthAddress>;
