import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_BITCOIN_NETWORKS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORKS } from '$env/networks/networks.sol.env';
import type { StorageAddressData } from '$lib/stores/address.store';
import type { Address, AddressType, OptionAddress } from '$lib/types/address';
import type { Network } from '$lib/types/network';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
import { parseBtcAddress, type BtcAddress } from '@dfinity/ckbtc';
import { isNullish } from '@dfinity/utils';

export const mapAddress = <T extends Address>(
	$addressStore: StorageAddressData<T>
): OptionAddress<T> => mapCertifiedData($addressStore);

export const isBtcAddress = (address: BtcAddress | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	try {
		parseBtcAddress(address);
		return true;
	} catch (_: unknown) {
		return false;
	}
};

export const invalidBtcAddress = (address: BtcAddress | undefined): boolean =>
	!isBtcAddress(address);

const ADDRESS_TYPE_TO_NETWORKS: { [key in AddressType]: Network[] } = {
	Icrc2: [ICP_NETWORK],
	Btc: SUPPORTED_BITCOIN_NETWORKS,
	Eth: [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS],
	Sol: SUPPORTED_SOLANA_NETWORKS
};

export const getNetworksForAddressType = (addressType: AddressType): Network[] =>
	ADDRESS_TYPE_TO_NETWORKS[addressType];
