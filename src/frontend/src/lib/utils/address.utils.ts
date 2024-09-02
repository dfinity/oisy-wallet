import type { OptionAddressData } from '$lib/stores/address.store';
import type { Address, OptionAddress } from '$lib/types/address';

export const mapAddress = ($addressData: OptionAddressData): OptionAddress<Address> =>
	$addressData === null ? null : $addressData?.data;
