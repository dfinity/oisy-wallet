import { warnSignOut } from '$lib/services/auth.services';
import type { OptionAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';
import type { ResultSuccess } from '$lib/types/utils';
import { isNullish } from '@dfinity/utils';

export const mapAddress = ($addressStore: OptionAddressData): OptionAddress<Address> =>
	$addressStore === null ? null : $addressStore?.data;

export const validateAddress = async <T extends Address>({
	$addressStore,
	certifyAddress
}: {
	$addressStore: OptionAddressData;
	certifyAddress: (address: T) => Promise<ResultSuccess<string>>;
}) => {
	if (isNullish($addressStore)) {
		// No address is loaded, we don't have to verify it
		return;
	}

	if ($addressStore.certified) {
		// The address is certified, all good
		return;
	}

	const { success, err } = await certifyAddress($addressStore.data);

	if (success) {
		// The address is valid
		return;
	}

	await warnSignOut(err ?? 'Error while certifying your address');
};
