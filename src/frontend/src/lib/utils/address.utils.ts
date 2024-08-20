import type { AddressData } from '$lib/stores/address.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { Address, OptionAddress } from '$lib/types/address';
import type { TokenId } from '$lib/types/token';

export const getNullableAddress = ({
	$addressStore,
	tokenId
}: {
	$addressStore: CertifiedStoreData<AddressData>;
	tokenId: TokenId;
}): OptionAddress<Address> =>
	$addressStore?.[tokenId] === null ? null : $addressStore?.[tokenId]?.data;
