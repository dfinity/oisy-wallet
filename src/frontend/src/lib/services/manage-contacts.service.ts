import type { Contact, ContactImage } from '$declarations/backend/backend.did';
import {
	createContact as createContactApi,
	deleteContact as deleteContactApi,
	getContactImages,
	getContactsPage,
	updateContact as updateContactApi
} from '$lib/api/backend.api';
import {
	CONTACT_IMAGES_BATCH_SIZE,
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
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

// The backend returns the contacts in pages that stay below the reply limit of a certified call.
const loadContactsPages = async (identity: Identity): Promise<Contact[]> => {
	const contacts: Contact[] = [];
	let after: bigint | undefined;

	do {
		const page = await getContactsPage({ identity, after });
		contacts.push(...page.contacts);
		after = fromNullable(page.next);
	} while (nonNullish(after));

	return contacts;
};

// Returns the IDs of the loaded contacts, or nothing once every attempt has failed.
const loadContactsWithRetries = async (
	identity: Identity
): Promise<ContactUi['id'][] | undefined> => {
	for (let attempt = 1; attempt <= CONTACTS_LOAD_MAX_ATTEMPTS; attempt++) {
		try {
			const result = await loadContactsPages(identity);
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

			return result.map(({ id }) => id);
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

// The images come apart from the contacts, in batches that stay below the reply limit of a
// certified call. A contact whose batch fails keeps an image that is not loaded (`undefined`),
// which `updateContact` reads before writing, so that an edit never removes it.
const loadContactImages = async ({
	identity,
	contactIds
}: {
	identity: Identity;
	contactIds: ContactUi['id'][];
}): Promise<void> => {
	const batches: ContactUi['id'][][] = [];
	for (let start = 0; start < contactIds.length; start += CONTACT_IMAGES_BATCH_SIZE) {
		batches.push(contactIds.slice(start, start + CONTACT_IMAGES_BATCH_SIZE));
	}

	const results = await Promise.allSettled(
		batches.map((batch) => getContactImages({ identity, contactIds: batch }))
	);

	const loadedIds = new Set<ContactUi['id']>();
	const images = new Map<ContactUi['id'], ContactImage>();
	let failure: unknown;

	results.forEach((result, index) => {
		if (result.status === 'rejected') {
			failure ??= result.reason;
			return;
		}

		batches[index].forEach((id) => loadedIds.add(id));
		result.value.forEach(({ contact_id, image }) => images.set(contact_id, image));
	});

	// A contact edited in the meantime already holds its image and is left as it is.
	contactsStore.update((contacts) =>
		contacts?.map((contact) =>
			contact.image === undefined && loadedIds.has(contact.id)
				? { ...contact, image: images.get(contact.id) ?? null }
				: contact
		)
	);

	// Contacts still show without the missing images, so this is worth watching, not an error.
	if (results.some(({ status }) => status === 'rejected')) {
		trackContact({
			step: 'load_images',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			severity: PLAUSIBLE_EVENT_SEVERITIES.WARN,
			errorType: toContactErrorType(failure)
		});
	}
};

export const loadContacts = async (identity: Identity): Promise<void> => {
	contactsStore.reset();

	const contactIds = await loadContactsWithRetries(identity);

	if (isNullish(contactIds)) {
		return;
	}

	await loadContactImages({ identity, contactIds });
};

// The write result carries the contact's image, so a missing one is known to be absent (`null`).
const mapWrittenContact = (contact: Contact): ContactUi => ({
	...mapToFrontendContact(contact),
	image: fromNullable(contact.image) ?? null
});

// A write without an image removes the stored one, so an image that has not loaded yet is read
// first.
const resolveImage = async ({
	contact,
	identity,
	image
}: {
	contact: ContactUi;
	identity: Identity;
	image?: ContactImage | null;
}): Promise<ContactImage | null> => {
	if (image !== undefined) {
		return image;
	}

	if (contact.image !== undefined) {
		return contact.image;
	}

	const [entry] = await getContactImages({ identity, contactIds: [contact.id] });
	return entry?.image ?? null;
};

export const createContact = async ({
	name,
	identity
}: {
	name: string;
	identity: Identity;
}): Promise<ContactUi> => {
	const result = await createContactApi({ name, identity });
	const contactUi = mapWrittenContact(result);
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
		image: await resolveImage({ contact, identity, image }),
		addresses: contact.addresses.sort((a, b) => compareContactAddresses({ a, b }))
	};

	const result = await updateContactApi({
		contact: mapToBackendContact(contactWithSortedAddresses),
		identity
	});

	const contactUi = mapWrittenContact(result);
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
