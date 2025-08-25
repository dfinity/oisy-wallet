<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import type { ContactImage } from '$declarations/backend/backend.did';
	import AddressBookInfoPage from '$lib/components/address-book/AddressBookInfoPage.svelte';
	import AddressBookQrCodeStep from '$lib/components/address-book/AddressBookQrCodeStep.svelte';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import CreateContactStep from '$lib/components/address-book/CreateContactStep.svelte';
	import DeleteAddressConfirmBottomSheet from '$lib/components/address-book/DeleteAddressConfirmBottomSheet.svelte';
	import DeleteAddressConfirmContent from '$lib/components/address-book/DeleteAddressConfirmContent.svelte';
	import DeleteContactConfirmBottomSheet from '$lib/components/address-book/DeleteContactConfirmBottomSheet.svelte';
	import DeleteContactConfirmContent from '$lib/components/address-book/DeleteContactConfirmContent.svelte';
	import EditAddressStep from '$lib/components/address-book/EditAddressStep.svelte';
	import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
	import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
	import SaveAddressStep from '$lib/components/address-book/SaveAddressStep.svelte';
	import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
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
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { sortedContacts } from '$lib/derived/contacts.derived';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import {
		createContact,
		deleteContact,
		updateContact
	} from '$lib/services/manage-contacts.service';
	import { wrapCallWith } from '$lib/services/utils.services';
	import { addressBookStore } from '$lib/stores/address-book.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AddressBookModalParams } from '$lib/types/address-book';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let loading = $state(false);

	export const callWithState =
		<T, R>(methodToCall: (params: T) => Promise<R>) =>
		async (params: T) => {
			loading = true;
			try {
				return await methodToCall(params);
			} finally {
				loading = false;
			}
		};

	const callCreateContact = $derived(
		callWithState(
			wrapCallWith({
				methodToCall: createContact,
				toastErrorMessage: $i18n.contact.error.create,
				trackEventNames: {
					success: TRACK_CONTACT_CREATE_SUCCESS,
					error: TRACK_CONTACT_CREATE_ERROR
				},
				identity: $authIdentity
			})
		)
	);

	const callUpdateContact = $derived(
		callWithState(
			wrapCallWith({
				methodToCall: updateContact,
				toastErrorMessage: $i18n.contact.error.update,
				trackEventNames: {
					success: TRACK_CONTACT_UPDATE_SUCCESS,
					error: TRACK_CONTACT_UPDATE_ERROR
				},
				identity: $authIdentity
			})
		)
	);

	const callDeleteContact = $derived(
		callWithState(
			wrapCallWith({
				methodToCall: deleteContact,
				toastErrorMessage: $i18n.contact.error.delete,
				trackEventNames: {
					success: TRACK_CONTACT_DELETE_SUCCESS,
					error: TRACK_CONTACT_DELETE_ERROR
				},
				identity: $authIdentity
			})
		)
	);

	const steps: WizardSteps<AddressBookSteps> = [
		{
			name: AddressBookSteps.ADDRESS_BOOK,
			title: $i18n.address_book.text.title
		},
		{
			name: AddressBookSteps.SAVE_ADDRESS,
			title: $i18n.address.save.title
		},
		{
			name: AddressBookSteps.CREATE_CONTACT,
			title: $i18n.address_book.create_contact.title
		},
		{
			name: AddressBookSteps.SHOW_CONTACT,
			title: $i18n.address_book.show_contact.title
		},
		{
			name: AddressBookSteps.EDIT_CONTACT,
			title: $i18n.address_book.edit_contact.title
		},
		{
			name: AddressBookSteps.EDIT_CONTACT_NAME,
			title: $i18n.contact.form.add_new_contact
		},
		{
			name: AddressBookSteps.DELETE_CONTACT,
			title: $i18n.contact.delete.title
		},
		{
			name: AddressBookSteps.SHOW_ADDRESS,
			// The title will be replaced with the name. No title is needed here.
			title: ''
		},
		{
			name: AddressBookSteps.EDIT_ADDRESS,
			title: $i18n.address_book.edit_contact.title
		},
		{
			name: AddressBookSteps.QR_CODE_SCAN,
			title: $i18n.address.qr.title
		},
		{
			name: AddressBookSteps.DELETE_ADDRESS,
			title: $i18n.address.delete.title
		}
	];

	let currentStep: WizardStep<AddressBookSteps> | undefined = $state();

	let modalData = $derived($modalStore?.data as AddressBookModalParams);

	// Allow to define an entrypoint when opening the modal. Here we listen to the modal data and go to the entrypoint step if were not already on it.
	onMount(() => {
		const data = modalData?.entrypoint?.type;

		if (nonNullish(data) && currentStep?.name !== data) {
			gotoStep(data);
		}
	});

	// Reset address book store on modal exit so we can start fresh the next time its opened
	onDestroy(() => {
		addressBookStore.reset();
	});

	let modal: WizardModal<AddressBookSteps> | undefined = $state();
	const close = () => {
		if (nonNullish(modalData?.entrypoint?.onComplete)) {
			modalData.entrypoint.onComplete();
			return;
		}
		modalStore.close();
	};

	let currentStepName = $derived(currentStep?.name);
	let previousStepName = $state<AddressBookSteps | undefined>();
	let editContactNameStep = $state<EditContactNameStep>();
	let editContactNameTitle = $state($i18n.contact.form.add_new_contact);

	let isDeletingContact = $state<boolean>(false);

	let qrCodeAddress = $state<string>();

	let currentContactId: bigint | undefined = $state();
	let currentAddressIndex: number | undefined = $state();

	const handleClose = () => {
		if (nonNullish(previousStepName)) {
			gotoStep(previousStepName);
		} else {
			gotoStep(AddressBookSteps.ADDRESS_BOOK);
		}
		previousStepName = undefined;
	};

	let currentContact = $derived($sortedContacts.find((c) => c.id === currentContactId));
	let contacts = $derived($sortedContacts);

	const gotoStep = (stepName: AddressBookSteps) => {
		if (nonNullish(modal)) {
			previousStepName = currentStepName;
			goToWizardStep({
				modal,
				steps,
				stepName
			});
		}
	};

	const confirmDeleteContact = () => {
		if (nonNullish(currentContact)) {
			gotoStep(AddressBookSteps.DELETE_CONTACT);
		}
	};

	const handleDeleteContact = async (id: bigint) => {
		await callDeleteContact({ id });
		currentContact = undefined;
		currentAddressIndex = undefined;
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

	const handleAddAddress = async (address: ContactAddressUi) => {
		if (isNullish(currentContact)) {
			return;
		}

		const addresses = [...currentContact.addresses, address];
		currentAddressIndex = undefined;
		qrCodeAddress = undefined;
		const contact = {
			...currentContact,
			addresses
		};
		await callUpdateContact({ contact });
		// if the entrypoint was SAVE_ADDRESS this is the last step of the flow, so we close the address book modal
		if (
			nonNullish(modalData?.entrypoint) &&
			modalData.entrypoint.type === AddressBookSteps.SAVE_ADDRESS
		) {
			close();
			return;
		}
		gotoStep(AddressBookSteps.SHOW_CONTACT);
	};

	const handleAddAvatar = async (image: ContactImage | null) => {
		if (isNullish(currentContact)) {
			return;
		}

		const contact = { ...currentContact };
		const isDeleting = isNullish(image);

		const tracking = {
			success: isDeleting ? TRACK_AVATAR_DELETE_SUCCESS : TRACK_AVATAR_UPDATE_SUCCESS,
			error: isDeleting ? TRACK_AVATAR_DELETE_ERROR : TRACK_AVATAR_UPDATE_ERROR
		};

		const callUpdateAvatar = callWithState(
			wrapCallWith({
				methodToCall: updateContact,
				toastErrorMessage: $i18n.contact.error.update,
				trackEventNames: tracking,
				identity: $authIdentity
			})
		);

		await callUpdateAvatar({ contact, image });
	};

	const handleSaveAddress = async (address: ContactAddressUi) => {
		if (isNullish(currentContact) || isNullish(currentAddressIndex)) {
			return;
		}

		const addresses = [...currentContact.addresses];
		addresses[currentAddressIndex] = { ...address };
		const contact = {
			...currentContact,
			addresses
		};
		await callUpdateContact({ contact });
		currentAddressIndex = undefined;
		gotoStep(AddressBookSteps.EDIT_CONTACT);
	};

	const confirmDeleteAddress = (index: number) => {
		if (nonNullish(currentContact)) {
			currentAddressIndex = index;
			gotoStep(AddressBookSteps.DELETE_ADDRESS);
		}
	};

	const handleDeleteAddress = async (index: number) => {
		if (nonNullish(currentContact)) {
			const addresses = currentContact.addresses.filter((a, i) => i !== index);
			const contact = {
				...currentContact,
				addresses
			};
			await callUpdateContact({ contact });
			currentAddressIndex = undefined;
			gotoStep(AddressBookSteps.EDIT_CONTACT);
		}
	};

	const navigateToEntrypointOrCallback = (callback: () => void) => {
		if (nonNullish(modalData?.entrypoint)) {
			gotoStep(modalData.entrypoint.type);
		} else {
			callback();
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={loading}
	onClose={close}
	{steps}
	testId={ADDRESS_BOOK_MODAL}
	bind:currentStep
>
	{#snippet title()}
		{#if currentStepName === AddressBookSteps.SHOW_ADDRESS && nonNullish(currentContact?.name)}
			<div class="flex flex-wrap items-center gap-2">
				<Avatar
					name={currentContact.name}
					image={currentContact.image}
					styleClass="rounded-full flex items-center justify-center"
					variant="xs"
				/>
				<div class="text-center text-lg font-semibold text-primary">
					{currentContact.name}
				</div>
			</div>
		{:else if currentStepName === AddressBookSteps.DELETE_CONTACT && nonNullish(currentContact)}
			{replacePlaceholders($i18n.contact.delete.title, { $contact: currentContact.name })}
		{:else if currentStepName === AddressBookSteps.EDIT_CONTACT_NAME && nonNullish(editContactNameStep)}
			{editContactNameTitle}
		{:else}
			{currentStep?.title}
		{/if}
	{/snippet}

	{#if currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep
			{contacts}
			onAddContact={() => {
				currentContactId = undefined;
				currentAddressIndex = undefined;
				previousStepName = AddressBookSteps.ADDRESS_BOOK;
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
			onShowAddress={({ contact, addressIndex }) => {
				currentContact = contact;
				currentAddressIndex = addressIndex;
				previousStepName = AddressBookSteps.ADDRESS_BOOK;
				gotoStep(AddressBookSteps.SHOW_ADDRESS);
			}}
			onShowContact={(contact) => {
				currentContactId = contact.id;
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_CONTACT && nonNullish(currentContact)}
		<ShowContactStep
			contact={currentContact}
			onAddAddress={() => {
				currentAddressIndex = undefined;
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
			}}
			onClose={() => {
				navigateToEntrypointOrCallback(() => gotoStep(AddressBookSteps.ADDRESS_BOOK));
			}}
			onEdit={(contact) => {
				currentContactId = contact.id;
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onShowAddress={(addressIndex) => {
				currentAddressIndex = addressIndex;
				previousStepName = AddressBookSteps.SHOW_CONTACT;
				gotoStep(AddressBookSteps.SHOW_ADDRESS);
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT && nonNullish(currentContact)}
		<!-- TODO find a better way to render EditContactStep with different onDeleteAddress functions -->
		<Responsive down="sm">
			<EditContactStep
				contact={currentContact}
				onAddAddress={() => {
					currentAddressIndex = undefined;
					previousStepName = AddressBookSteps.SHOW_CONTACT;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
				onAvatarEdit={handleAddAvatar}
				onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
				onDeleteAddress={(index) => {
					currentAddressIndex = index;
				}}
				onDeleteContact={() => {
					isDeletingContact = true;
				}}
				onEdit={(contact) => {
					currentContact = contact;
					gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
				}}
				onEditAddress={(index) => {
					currentAddressIndex = index;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
			/>
		</Responsive>
		<Responsive up="md">
			<EditContactStep
				contact={currentContact}
				onAddAddress={() => {
					currentAddressIndex = undefined;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
				onAvatarEdit={handleAddAvatar}
				onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
				onDeleteAddress={confirmDeleteAddress}
				onDeleteContact={confirmDeleteContact}
				onEdit={(contact) => {
					currentContact = contact;
					gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
				}}
				onEditAddress={(index) => {
					currentAddressIndex = index;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
			/>
		</Responsive>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT_NAME}
		<EditContactNameStep
			bind:this={editContactNameStep}
			contact={currentContact}
			disabled={loading}
			isNewContact={isNullish(currentContact)}
			onAddContact={async (contact: Pick<ContactUi, 'name'>) => {
				const createdContact = await callCreateContact({ name: contact.name });
				if (modalData?.entrypoint) {
					currentAddressIndex = undefined;
					currentContact = createdContact;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
					previousStepName = AddressBookSteps.SAVE_ADDRESS;
				} else {
					if (nonNullish(createdContact)) {
						currentContactId = createdContact.id;
						gotoStep(AddressBookSteps.SHOW_CONTACT);
					} else {
						gotoStep(AddressBookSteps.ADDRESS_BOOK);
					}
				}
			}}
			onClose={() => {
				navigateToEntrypointOrCallback(handleClose);
			}}
			onSaveContact={async (contact: ContactUi) => {
				await callUpdateContact({ contact });
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			bind:title={editContactNameTitle}
		/>
	{:else if currentStep?.name === AddressBookSteps.EDIT_ADDRESS && nonNullish(currentContact)}
		<EditAddressStep
			address={nonNullish(currentAddressIndex)
				? currentContact?.addresses[currentAddressIndex]
				: nonNullish(qrCodeAddress)
					? { address: qrCodeAddress }
					: undefined}
			contact={currentContact}
			disabled={loading}
			isNewAddress={isNullish(currentAddressIndex)}
			onAddAddress={handleAddAddress}
			onClose={() => {
				currentAddressIndex = undefined;
				handleClose();
			}}
			onQRCodeScan={() =>
				nonNullish(modal) &&
				goToWizardStep({ modal, steps, stepName: AddressBookSteps.QR_CODE_SCAN })}
			onSaveAddress={handleSaveAddress}
		/>
	{:else if currentStep?.name === AddressBookSteps.DELETE_ADDRESS && nonNullish(currentContact) && nonNullish(currentAddressIndex)}
		<DeleteAddressConfirmContent
			address={currentContact.addresses[currentAddressIndex]}
			contact={currentContact}
			disabled={loading}
			onCancel={() => {
				currentAddressIndex = undefined;
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onDelete={() => nonNullish(currentAddressIndex) && handleDeleteAddress(currentAddressIndex)}
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_ADDRESS}
		{#if nonNullish(currentAddressIndex) && nonNullish(currentContact?.addresses?.[currentAddressIndex])}
			<AddressBookInfoPage
				address={currentContact.addresses[currentAddressIndex]}
				onClose={() => {
					currentAddressIndex = undefined;
					handleClose();
				}}
			/>
		{/if}
	{:else if currentStep?.name === AddressBookSteps.DELETE_CONTACT && nonNullish(currentContact)}
		<DeleteContactConfirmContent
			contact={currentContact}
			disabled={loading}
			onCancel={() => {
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onDelete={handleDeleteContact}
		/>
	{:else if currentStep?.name === AddressBookSteps.SAVE_ADDRESS}
		<SaveAddressStep
			onClose={close}
			onCreateContact={() => {
				currentContact = undefined;
				gotoStep(AddressBookSteps.CREATE_CONTACT);
			}}
			onSelectContact={(contact: ContactUi) => {
				currentContact = contact;
				currentAddressIndex = undefined;
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.CREATE_CONTACT}
		<CreateContactStep
			disabled={loading}
			onBack={() => gotoStep(AddressBookSteps.SAVE_ADDRESS)}
			onSave={async (contact: ContactUi) => {
				loading = true;
				currentContact = contact;
				currentAddressIndex = undefined;
				const createdContact = await callCreateContact({ name: contact.name });
				await callUpdateContact({ contact: { ...createdContact, ...contact } });
				close();
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.QR_CODE_SCAN}
		<AddressBookQrCodeStep
			onCancel={() =>
				nonNullish(modal) &&
				goToWizardStep({ modal, steps, stepName: AddressBookSteps.EDIT_ADDRESS })}
			onScan={({ code }) => {
				qrCodeAddress = code;
			}}
		/>
	{/if}
</WizardModal>

{#if currentStep?.name === AddressBookSteps.EDIT_CONTACT && nonNullish(currentContact) && nonNullish(currentAddressIndex)}
	<DeleteAddressConfirmBottomSheet
		address={currentContact.addresses[currentAddressIndex]}
		contact={currentContact}
		disabled={loading}
		onCancel={() => (currentAddressIndex = undefined)}
		onDelete={() => nonNullish(currentAddressIndex) && handleDeleteAddress(currentAddressIndex)}
	/>
{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT && nonNullish(currentContact) && isDeletingContact}
	<DeleteContactConfirmBottomSheet
		contact={currentContact}
		disabled={loading}
		onCancel={() => {
			isDeletingContact = false;
		}}
		onDelete={() => {
			isDeletingContact = false;
			if (nonNullish(currentContact)) {
				handleDeleteContact(currentContact.id);
			}
		}}
	/>
{/if}
