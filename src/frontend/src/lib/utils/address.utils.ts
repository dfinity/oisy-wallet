import type { StorageAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';
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
