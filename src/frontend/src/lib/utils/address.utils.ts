import { isIcrcAddress } from '$icp/utils/icrc-account.utils';
import type { StorageAddressData } from '$lib/stores/address.store';
import { type Address, type AddressType, type OptionAddress } from '$lib/types/address';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
import { isSolAddress } from '$sol/utils/sol-address.utils';
import { parseBtcAddress, type BtcAddress } from '@dfinity/ckbtc';
import { isEmptyString, isNullish } from '@dfinity/utils';
import { isEthAddress, isIcpAccountIdentifier } from './account.utils';

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

const ADDRESS_VALIDATORS: { [key in AddressType]: (address: string) => boolean } = {
	ICP: (address) => isIcpAccountIdentifier(address) || isIcrcAddress(address),
	BTC: (address) => isBtcAddress({ address }),
	ETH: (address) => isEthAddress(address),
	SOL: (address) => isSolAddress(address)
};

/**
 * Identifies the type of blockchain address from a given string.
 * Returns undefined if the address is empty or not recognized,
 * and throws an error if the address matches multiple types.
 */
export const recognizeAddress = (address: string | undefined): AddressType | undefined => {
	if (isNullish(address) || isEmptyString(address)) {
		return;
	}

	const detectedTypes = Object.entries(ADDRESS_VALIDATORS)
		.filter(([_, validator]) => validator(address))
		.map(([addressType]) => addressType as AddressType);

	if (detectedTypes.length > 1) {
		throw new Error(`Detected more than one network type: ${JSON.stringify(detectedTypes)}`);
	}

	return detectedTypes[0];
};
