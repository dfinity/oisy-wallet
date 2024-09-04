import type { StorageAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';

export const mapAddress = <T extends Address>(
	$addressStore: StorageAddressData<T>
): OptionAddress<Address> => ($addressStore === null ? null : $addressStore?.data);
