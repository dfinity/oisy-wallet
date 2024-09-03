import type { OptionCertifiedAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';

export const mapAddress = <T extends Address>(
	$addressStore: OptionCertifiedAddressData<T>
): OptionAddress<T> => ($addressStore === null ? null : $addressStore?.data);
