import type { ContactUi } from '$lib/types/contact';
import type { NetworkContacts } from '$lib/types/contacts';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
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
