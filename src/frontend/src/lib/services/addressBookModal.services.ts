import type { ContactImage } from '$declarations/backend/backend.did';
import { AddressBookSteps } from '$lib/enums/progress-steps';
import { wrapCallWith } from '$lib/services/utils.services';
import {
	currentAddressIndex,
	currentContact,
	currentContactId,
	loading,
	qrCodeAddress
} from '$lib/stores/addressBookModal.store';
import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
import type { OptionIdentity } from '$lib/types/identity';
import type { WizardModal, WizardSteps } from '@dfinity/gix-components';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export type AddressBookDeps = {
	i18n: I18n;
	identity: OptionIdentity;
	createContact: (args: any) => Promise<ContactUi>;
	updateContact: (args: any) => Promise<ContactUi>;
	deleteContact: (args: any) => Promise<void>;
	steps: WizardSteps<AddressBookSteps>;
	modal: WizardModal<AddressBookSteps>;
	track: {
		createSuccess: string;
		createError: string;
		updateSuccess: string;
		updateError: string;
		deleteSuccess: string;
		deleteError: string;
		avatarUpdateSuccess: string;
		avatarUpdateError: string;
		avatarDeleteSuccess: string;
		avatarDeleteError: string;
	};
};

const withState =
	<T extends (...a: any[]) => Promise<any>>(fn: T) =>
	async (...args: Parameters<T>) => {
		loading.set(true);
		try {
			return await fn(...args);
		} finally {
			loading.set(false);
		}
	};

export function makeController(deps: AddressBookDeps) {
	const callCreateContact = withState(
		wrapCallWith({
			methodToCall: deps.createContact,
			toastErrorMessage: deps.i18n.contact.error.create,
			trackEventNames: { success: deps.track.createSuccess, error: deps.track.createError },
			identity: deps.identity
		})
	);

	const callUpdateContact = withState(
		wrapCallWith({
			methodToCall: deps.updateContact,
			toastErrorMessage: deps.i18n.contact.error.update,
			trackEventNames: { success: deps.track.updateSuccess, error: deps.track.updateError },
			identity: deps.identity
		})
	);

	const callDeleteContact = withState(
		wrapCallWith({
			methodToCall: deps.deleteContact,
			toastErrorMessage: deps.i18n.contact.error.delete,
			trackEventNames: { success: deps.track.deleteSuccess, error: deps.track.deleteError },
			identity: deps.identity
		})
	);

	async function handleDeleteContact(id: bigint) {
		await callDeleteContact({ id });
		currentAddressIndex.set(undefined);
		currentContactId.set(undefined);
		return { next: AddressBookSteps.ADDRESS_BOOK as const };
	}

	async function handleAddAvatar(image: ContactImage | null) {
		const contact = get(currentContact);
		if (isNullish(contact)) return;

		const isDeleting = isNullish(image);
		const tracking = {
			success: isDeleting ? deps.track.avatarDeleteSuccess : deps.track.avatarUpdateSuccess,
			error: isDeleting ? deps.track.avatarDeleteError : deps.track.avatarUpdateError
		};

		const callUpdateAvatar = withState(
			wrapCallWith({
				methodToCall: deps.updateContact,
				toastErrorMessage: deps.i18n.contact.error.update,
				trackEventNames: tracking,
				identity: deps.identity
			})
		);

		await callUpdateAvatar({ contact, image });
	}

	async function handleAddAddress(address: ContactAddressUi) {
		const contact = get(currentContact);
		if (isNullish(contact)) return;

		const updated = { ...contact, addresses: [...contact.addresses, address] };
		currentAddressIndex.set(undefined);
		qrCodeAddress.set(undefined);
		await callUpdateContact({ contact: updated });

		return { next: AddressBookSteps.SHOW_CONTACT as const };
	}

	async function handleSaveAddress(address: ContactAddressUi) {
		const contact = get(currentContact);
		const index = get(currentAddressIndex);
		if (isNullish(contact) || isNullish(index)) return;

		const addresses = [...contact.addresses];
		addresses[index] = { ...address };
		await callUpdateContact({ contact: { ...contact, addresses } });
		currentAddressIndex.set(undefined);
		return { next: AddressBookSteps.EDIT_CONTACT as const };
	}

	async function handleDeleteAddress(index: number) {
		const contact = get(currentContact);
		if (isNullish(contact)) return;

		const addresses = contact.addresses.filter((_, i) => i !== index);
		await callUpdateContact({ contact: { ...contact, addresses } });
		currentAddressIndex.set(undefined);
		return { next: AddressBookSteps.EDIT_CONTACT as const };
	}

	return {
		handleAddAvatar,
		handleAddAddress,
		handleSaveAddress,
		handleDeleteAddress,
		handleDeleteContact,
		callCreateContact,
		callUpdateContact
	};
}
