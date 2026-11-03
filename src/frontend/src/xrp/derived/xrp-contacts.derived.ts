import { contacts } from '$lib/derived/contacts.derived';
import type { NetworkContacts } from '$lib/types/contacts';
import { getNetworkContacts } from '$lib/utils/contacts.utils';
import { derived, type Readable } from 'svelte/store';

export const xrpNetworkContacts: Readable<NetworkContacts> = derived([contacts], ([$contacts]) =>
	getNetworkContacts({ addressType: 'Xrp', contacts: $contacts })
);
