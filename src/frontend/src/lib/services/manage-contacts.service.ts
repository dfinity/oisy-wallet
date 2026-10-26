import type { ContactImage } from '$declarations/backend/backend.did';
import {
	createContact as createContactApi,
	deleteContact as deleteContactApi,
	getContacts,
	updateContact as updateContactApi
} from '$lib/api/backend.api';
import {
	CONTACTS_LOAD_MAX_ATTEMPTS,
	CONTACTS_LOAD_RETRY_BASE_DELAY
} from '$lib/constants/contact.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENT_SEVERITIES } from '$lib/enums/plausible';
import { toContactErrorType, trackContact } from '$lib/services/contacts-analytics.services';
import { contactsStore } from '$lib/stores/contacts.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { ContactUi } from '$lib/types/contact';
import { compareContactAddresses } from '$lib/utils/contact-address.utils';
import { mapToBackendContact, mapToFrontendContact } from '$lib/utils/contact.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

export const loadContacts = async (identity: Identity): Promise<void> => {
	contactsStore.reset();

	for (let attempt = 1; attempt <= CONTACTS_LOAD_MAX_ATTEMPTS; attempt++) {
		try {
			const result = await getContacts({ identity });
			const contactsWithSortedAddresses = result.map((contact) => {
				const contactUi = mapToFrontendContact(contact);
				return {
					...contactUi,
					addresses: contactUi.addresses.sort((a, b) => compareContactAddresses({ a, b }))
				};
			});
			contactsStore.set(contactsWithSortedAddresses);

			// A load that needed a retry is worth watching before it turns into failures.
			if (attempt > 1) {
				trackContact({
					step: 'load_all',
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
					severity: PLAUSIBLE_EVENT_SEVERITIES.WARN
				});
			}

			return;
		} catch (err: unknown) {
			if (attempt === CONTACTS_LOAD_MAX_ATTEMPTS) {
				// The store stays unset: an empty list would read as "no contacts".
				trackContact({
					step: 'load_all',
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					severity: PLAUSIBLE_EVENT_SEVERITIES.ERROR,
					errorType: toContactErrorType(err)
				});

				toastsError({ msg: { text: get(i18n).contact.error.load }, err });

				return;
			}

			await waitForMilliseconds(CONTACTS_LOAD_RETRY_BASE_DELAY * 2 ** (attempt - 1));
		}
	}
};

export const createContact = async ({
	name,
	identity
}: {
	name: string;
	identity: Identity;
}): Promise<ContactUi> => {
	const result = await createContactApi({ name, identity });
	const contactUi = mapToFrontendContact(result);
	contactsStore.addContact(contactUi);
	return contactUi;
};

export const updateContact = async ({
	contact,
	identity,
	image
}: {
	contact: ContactUi;
	identity: Identity;
	image?: ContactImage | null;
}): Promise<ContactUi> => {
	const contactWithSortedAddresses = {
		...contact,
		image: image !== undefined ? image : contact.image,
		addresses: contact.addresses.sort((a, b) => compareContactAddresses({ a, b }))
	};

	const result = await updateContactApi({
		contact: mapToBackendContact(contactWithSortedAddresses),
		identity
	});

	const contactUi = mapToFrontendContact(result);
	contactsStore.updateContact(contactUi);
	return contactUi;
};

export const deleteContact = async ({
	id,
	identity
}: {
	id: ContactUi['id'];
	identity: Identity;
}): Promise<void> => {
	await deleteContactApi({ contactId: id, identity });
	contactsStore.removeContact(id);
};
