import type { OptionAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';

export const mapAddress = ($addressStore: OptionAddressData): OptionAddress<Address> =>
	$addressStore === null ? null : $addressStore?.data;
