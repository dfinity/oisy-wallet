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
import type { Identity } from '@dfinity/agent';
import type { WizardModal, WizardSteps } from '@dfinity/gix-components';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';
import {
	TRACK_CONTACT_CREATE_ERROR,
	TRACK_CONTACT_CREATE_SUCCESS,
	TRACK_CONTACT_DELETE_ERROR,
	TRACK_CONTACT_DELETE_SUCCESS,
	TRACK_CONTACT_UPDATE_ERROR,
	TRACK_CONTACT_UPDATE_SUCCESS,
	TRACK_AVATAR_UPDATE_SUCCESS,
	TRACK_AVATAR_UPDATE_ERROR,
	TRACK_AVATAR_DELETE_SUCCESS,
	TRACK_AVATAR_DELETE_ERROR
} from '$lib/constants/analytics.contants';

export interface AddressBookDeps {
	i18n: I18n;
	identity: OptionIdentity;
	createContact: (args: { name: string; identity: Identity }) => Promise<ContactUi>;
	updateContact: (args: { contact: ContactUi; identity: Identity }) => Promise<ContactUi>;
	deleteContact: (args: { id: bigint; identity: Identity }) => Promise<void>;
	steps: WizardSteps<AddressBookSteps>;
	modal: WizardModal<AddressBookSteps>;
}

interface CreateContactParams {
	name: string;
}

interface UpdateContactParams {
	contact: ContactUi;
	image?: ContactImage | null;
}

interface DeleteContactParams {
	id: bigint;
}

// Create a more specific type for wrapped functions
type WrappedFunction<T, R> = (params: T) => Promise<R | undefined>;

const withState =
	<T, R>(wrappedFn: WrappedFunction<T, R>) =>
	async (params: T): Promise<R | undefined> => {
		loading.set(true);
		try {
			return await wrappedFn(params);
		} finally {
			loading.set(false);
		}
	};

export const makeController = (deps: AddressBookDeps) => {
	const callCreateContact = withState<CreateContactParams, ContactUi>(
		wrapCallWith({
			methodToCall: deps.createContact,
			toastErrorMessage: deps.i18n.contact.error.create,
			trackEventNames: { success: TRACK_CONTACT_CREATE_SUCCESS, error: TRACK_CONTACT_CREATE_ERROR },
			identity: deps.identity
		})
	);

	const callUpdateContact = withState<UpdateContactParams, ContactUi>(
		wrapCallWith({
			methodToCall: (params: { contact: ContactUi; identity: Identity }) =>
			deps.updateContact(params),
			toastErrorMessage: deps.i18n.contact.error.update,
			trackEventNames: { success: TRACK_CONTACT_UPDATE_SUCCESS, error: TRACK_CONTACT_UPDATE_ERROR },
			identity: deps.identity
		})
	);

	const callDeleteContact = withState<DeleteContactParams, void>(
		wrapCallWith({
			methodToCall: deps.deleteContact,
			toastErrorMessage: deps.i18n.contact.error.delete,
			trackEventNames: { success: TRACK_CONTACT_DELETE_SUCCESS, error: TRACK_CONTACT_DELETE_ERROR },
			identity: deps.identity
		})
	);

	const handleDeleteContact = async (id: bigint) => {
		await callDeleteContact({ id });
		currentAddressIndex.set(undefined);
		currentContactId.set(undefined);
		return { next: AddressBookSteps.ADDRESS_BOOK as const };
	};

	const handleAddAvatar = async (image: ContactImage | null) => {
		const contact = get(currentContact);
		if (isNullish(contact)) {
			return;
		}

		const isDeleting = isNullish(image);
		const tracking = {
			success: isDeleting ? TRACK_AVATAR_DELETE_SUCCESS : TRACK_AVATAR_UPDATE_SUCCESS,
			error: isDeleting ? TRACK_AVATAR_DELETE_ERROR : TRACK_AVATAR_UPDATE_ERROR
		};

		const callUpdateAvatar = withState<UpdateContactParams, ContactUi>(
			wrapCallWith({
				methodToCall: (params: { contact: ContactUi; identity: Identity }) =>
				deps.updateContact({ ...params, contact: { ...params.contact, image } }),
				toastErrorMessage: deps.i18n.contact.error.update,
				trackEventNames: tracking,
				identity: deps.identity
			})
		);

		await callUpdateAvatar({ contact });
	};

	const handleAddAddress = async (address: ContactAddressUi) => {
		const contact = get(currentContact);
		if (isNullish(contact)) {
			return;
		}

		const updated = { ...contact, addresses: [...contact.addresses, address] };
		currentAddressIndex.set(undefined);
		qrCodeAddress.set(undefined);
		await callUpdateContact({ contact: updated });
		return { next: AddressBookSteps.SHOW_CONTACT as const };
	};

	const handleSaveAddress = async (address: ContactAddressUi) => {
		const contact = get(currentContact);
		const index = get(currentAddressIndex);
		if (isNullish(contact) || isNullish(index)) {
			return;
		}

		const addresses = [...contact.addresses];
		addresses[index] = { ...address };
		await callUpdateContact({ contact: { ...contact, addresses } });
		currentAddressIndex.set(undefined);
		return { next: AddressBookSteps.EDIT_CONTACT as const };
	};

	const handleDeleteAddress = async (index: number) => {
		const contact = get(currentContact);
		if (isNullish(contact)) {
			return;
		}

		const addresses = contact.addresses.filter((_, i) => i !== index);
		await callUpdateContact({ contact: { ...contact, addresses } });
		currentAddressIndex.set(undefined);
		return { next: AddressBookSteps.EDIT_CONTACT as const };
	};

	return {
		handleAddAvatar,
		handleAddAddress,
		handleSaveAddress,
		handleDeleteAddress,
		handleDeleteContact,
		callCreateContact,
		callUpdateContact
	};
};
