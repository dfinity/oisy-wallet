import { TOKEN_ACCOUNT_ID_TYPES_CASE_SENSITIVE } from '$lib/constants/token-account-id.constants';
import type { StorageAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
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

export const areAddressesEqual = <T extends Address>({
	address1,
	address2,
	addressType
}: {
	address1: OptionAddress<T>;
	address2: OptionAddress<T>;
	addressType: TokenAccountIdTypes;
}): boolean => {
	if (isNullish(address1) || isNullish(address2)) {
		return false;
	}

	const isCaseSensitive = TOKEN_ACCOUNT_ID_TYPES_CASE_SENSITIVE[addressType] ?? false;

	if (isCaseSensitive) {
		return address1 === address2;
	}

	return address1.toLowerCase() === address2.toLowerCase();
};
