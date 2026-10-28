import { ckMinterBuiltInContacts } from '$icp-eth/derived/ck-minter-contacts.derived';
import { ckMinterPrincipalBuiltInContacts } from '$icp-eth/utils/ck-minter-principal-contacts.utils';
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
	([$ckMinterBuiltInContacts, $contacts]) => [
		...ckMinterPrincipalBuiltInContacts,
		...$ckMinterBuiltInContacts,
		...$contacts
	]
);

export const sortedContacts: Readable<ContactUi[]> = derived([contacts], ([$contacts]) =>
	$contacts.sort((a, b) => a.name.localeCompare(b.name))
);

// The AI assistant refers to an address by this ID between its request and its reply, so an
// address keeps its ID for as long as its contact, its position and the address itself stay the
// same; an update that only adds images, for one, keeps every ID.
const addressIds = new Map<string, string>();

const addressIdOf = ({
	contactId,
	index,
	address: { addressType, address }
}: {
	contactId: ContactUi['id'];
	index: number;
	address: ContactUi['addresses'][number];
}): string => {
	const key = `${contactId}:${index}:${addressType}:${address}`;

	const existing = addressIds.get(key);
	if (nonNullish(existing)) {
		return existing;
	}

	const id = crypto.randomUUID().toString();
	addressIds.set(key, id);
	return id;
};

export const extendedAddressContacts: Readable<ExtendedAddressContactUiMap> = derived(
	[contacts],
	([$contacts]) =>
		$contacts.reduce<ExtendedAddressContactUiMap>(
			(acc, { addresses, id, ...rest }) => ({
				...acc,
				[`${id}`]: {
					...rest,
					id,
					addresses: addresses.map((address, index) => ({
						...address,
						id: addressIdOf({ contactId: id, index, address })
					}))
				}
			}),
			{}
		)
);
