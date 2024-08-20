export type Address = string;

export type BtcAddress = Address;

export type EthAddress = Address;

export type OptionEthAddress = EthAddress | undefined | null;

export interface SafeLoadTokenAddressParams {
	displayProgressModal: () => void;
	onIdbSuccess: () => void;
}
