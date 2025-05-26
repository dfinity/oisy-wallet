import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const contacts: Readable<ContactUi[]> = derived([contactsStore], ([$contactsStore]) =>
	nonNullish($contactsStore) ? $contactsStore : []
);
