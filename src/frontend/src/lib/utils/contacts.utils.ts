import type { Address } from '$lib/types/address';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkContacts } from '$lib/types/contacts';
import type { NetworkId } from '$lib/types/network';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import { getCaseSensitiveness } from '$lib/utils/address.utils';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const getNetworkContacts = ({
	addressType,
	contacts
}: {
	addressType: TokenAccountIdTypes;
	contacts: ContactUi[];
}): NetworkContacts =>
	isNullish(contacts)
		? {}
		: contacts.reduce<NetworkContacts>((acc, contact) => {
				contact.addresses.forEach(({ addressType: contactAddressType, address }) => {
					const key = getNetworkContactKey({ contact, address });

					if (contactAddressType === addressType && isNullish(acc[key])) {
						acc[key] = {
							address,
							contact
						};
					}
				});

				return acc;
			}, {});

export const getNetworkContact = ({
	networkContacts,
	address,
	networkId
}: {
	networkContacts: NetworkContacts;
	address: Address;
	networkId: NetworkId;
}): ContactUi | undefined => {
	const isCaseSensitive = getCaseSensitiveness({ networkId });

	const matchingNetworkContactId = Object.keys(networkContacts).find((key) => {
		const networkContactAddress = networkContacts[key].address;

		if (isCaseSensitive) {
			return networkContactAddress === address;
		}

		return networkContactAddress.toLowerCase() === address.toLowerCase();
	});

	return nonNullish(matchingNetworkContactId)
		? networkContacts[matchingNetworkContactId].contact
		: undefined;
};
