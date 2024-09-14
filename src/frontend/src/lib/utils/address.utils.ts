import type { StorageAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';

export const mapAddress = <T extends Address>(
	$addressStore: StorageAddressData<T>
): OptionAddress<Address> => mapCertifiedData($addressStore);
