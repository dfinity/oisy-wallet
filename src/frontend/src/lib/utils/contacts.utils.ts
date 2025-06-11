import type { Address } from '$lib/types/address';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkContacts } from '$lib/types/contacts';
import type { NetworkId } from '$lib/types/network';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import { getRecordValueByCaseSensitivity } from '$lib/utils/record.utils';
import { isNullish } from '@dfinity/utils';

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
				contact.addresses.forEach((addressUi) => {
					if (addressUi.addressType === addressType && isNullish(acc[addressUi.address])) {
						acc[addressUi.address] = contact;
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
	networkId: NetworkId | undefined;
}): ContactUi | undefined =>
	getRecordValueByCaseSensitivity({
		record: networkContacts,
		address,
		networkId
	});
