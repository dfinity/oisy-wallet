import { isIcrcAddress } from '$icp/utils/icrc-account.utils';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi, ExtendedAddressContactUiMap } from '$lib/types/contact';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

const contactsInitialized: Readable<boolean> = derived([contactsStore], ([$contactsStore]) =>
	nonNullish($contactsStore)
);

export const contactsNotInitialized: Readable<boolean> = derived(
	[contactsInitialized],
	([$contactsInitialized]) => !$contactsInitialized
);

export const contacts: Readable<ContactUi[]> = derived([contactsStore], ([$contactsStore]) =>
	nonNullish($contactsStore) ? $contactsStore : []
);

export const sortedContacts: Readable<ContactUi[]> = derived([contacts], ([$contacts]) =>
	$contacts.sort((a, b) => a.name.localeCompare(b.name))
);

export const extendedAddressContacts: Readable<ExtendedAddressContactUiMap> = derived(
	[contacts],
	([$contacts]) =>
		$contacts.reduce<ExtendedAddressContactUiMap>(
			(acc, { addresses, id, ...rest }) => ({
				...acc,
				[`${id}`]: {
					...rest,
					id,
					addresses: addresses.map((address) => ({
						...address,
						id: crypto.randomUUID().toString(),
						...(address.addressType === 'Icrcv2' && { isPrincipal: isIcrcAddress(address.address) })
					}))
				}
			}),
			{}
		)
);
