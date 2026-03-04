import { ckMinterBuiltInContacts } from '$icp-eth/derived/ck-minter-contacts.derived';
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

/**
 * All contacts including user-managed contacts and built-in system contacts
 * (e.g. CK minter contracts). Use this for address resolution in display contexts.
 *
 * We put built-in contacts first so that they take precedence over user contacts in case of address conflicts.
 * Built-in contacts are more likely to be recognised by users and thus less confusing than user contacts.
 */
export const allContacts: Readable<ContactUi[]> = derived(
	[ckMinterBuiltInContacts, contacts],
	([$ckMinterBuiltInContacts, $contacts]) => [...$ckMinterBuiltInContacts, ...$contacts]
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
						id: crypto.randomUUID().toString()
					}))
				}
			}),
			{}
		)
);
