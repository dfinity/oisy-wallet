<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import AddressBookInfoPage from '$lib/components/address-book/AddressBookInfoPage.svelte';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import DeleteAddressConfirmBottomSheet from '$lib/components/address-book/DeleteAddressConfirmBottomSheet.svelte';
	import DeleteAddressConfirmContent from '$lib/components/address-book/DeleteAddressConfirmContent.svelte';
	import DeleteContactConfirmBottomSheet from '$lib/components/address-book/DeleteContactConfirmBottomSheet.svelte';
	import DeleteContactConfirmContent from '$lib/components/address-book/DeleteContactConfirmContent.svelte';
	import EditAddressStep from '$lib/components/address-book/EditAddressStep.svelte';
	import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
	import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
	import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import {
		TRACK_CONTACT_CREATE_ERROR,
		TRACK_CONTACT_CREATE_SUCCESS,
		TRACK_CONTACT_DELETE_ERROR,
		TRACK_CONTACT_DELETE_SUCCESS,
		TRACK_CONTACT_UPDATE_ERROR,
		TRACK_CONTACT_UPDATE_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import {
		createContact,
		deleteContact,
		updateContact
	} from '$lib/services/manage-contacts.service';
	import { wrapCallWith } from '$lib/services/utils.services';
	import { contactsStore } from '$lib/stores/contacts.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	const callCreateContact = $derived(
		wrapCallWith({
			methodToCall: createContact,
			toastErrorMessage: $i18n.contact.error.create,
			trackEventNames: {
				success: TRACK_CONTACT_CREATE_SUCCESS,
				error: TRACK_CONTACT_CREATE_ERROR
			},
			identity: $authIdentity
		})
	);

	const callUpdateContact = $derived(
		wrapCallWith({
			methodToCall: updateContact,
			toastErrorMessage: $i18n.contact.error.update,
			trackEventNames: {
				success: TRACK_CONTACT_UPDATE_SUCCESS,
				error: TRACK_CONTACT_UPDATE_ERROR
			},
			identity: $authIdentity
		})
	);

	const callDeleteContact = $derived(
		wrapCallWith({
			methodToCall: deleteContact,
			toastErrorMessage: $i18n.contact.error.delete,
			trackEventNames: {
				success: TRACK_CONTACT_DELETE_SUCCESS,
				error: TRACK_CONTACT_DELETE_ERROR
			},
			identity: $authIdentity
		})
	);

	const steps: WizardSteps = [
		{
			name: AddressBookSteps.ADDRESS_BOOK,
			title: $i18n.address_book.text.title
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
			name: AddressBookSteps.DELETE_ADDRESS,
			title: $i18n.address.delete.title
		}
	] satisfies { name: AddressBookSteps; title: string }[] as WizardSteps;

	let currentStep: WizardStep | undefined = $state();
	let modal: WizardModal | undefined = $state();
	const close = () => modalStore.close();

	let currentStepName = $derived(currentStep?.name as AddressBookSteps | undefined);
	let previousStepName = $state<AddressBookSteps | undefined>();
	let editContactNameStep = $state<EditContactNameStep>();

	let isDeletingContact = $state<boolean>(false);

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

	let currentContact = $derived($contactsStore?.find((c) => c.id === currentContactId));
	let contacts = $derived($contactsStore);

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
		const contact = {
			...currentContact,
			addresses
		};
		await callUpdateContact({ contact });
		gotoStep(AddressBookSteps.SHOW_CONTACT);
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
		gotoStep(AddressBookSteps.SHOW_CONTACT);
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
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	disablePointerEvents={true}
	testId={ADDRESS_BOOK_MODAL}
	on:nnsClose={close}
>
	<svelte:fragment slot="title">
		{#if currentStepName === AddressBookSteps.SHOW_ADDRESS && nonNullish(currentContact?.name)}
			<div class="flex flex-wrap items-center gap-2">
				<Avatar
					name={currentContact.name}
					variant="xs"
					styleClass="rounded-full flex items-center justify-center"
				/>
				<div class="text-center text-lg font-semibold text-primary">
					{currentContact.name}
				</div>
			</div>
		{:else if currentStepName === AddressBookSteps.DELETE_CONTACT && nonNullish(currentContact)}
			{replacePlaceholders($i18n.contact.delete.title, { $contact: currentContact.name })}
		{:else if currentStepName === AddressBookSteps.EDIT_CONTACT_NAME && nonNullish(editContactNameStep)}
			{editContactNameStep.title}
		{:else}
			{currentStep?.title}
		{/if}
	</svelte:fragment>

	{#if isNullish(contacts)}
		{$i18n.address_book.text.loading_contacts}
	{:else if currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep
			{contacts}
			onShowContact={(contact) => {
				currentContactId = contact.id;
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}
			onAddContact={() => {
				currentContactId = undefined;
				currentAddressIndex = undefined;
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
			onShowAddress={({ contact, addressIndex }) => {
				currentContact = contact;
				currentAddressIndex = addressIndex;
				previousStepName = AddressBookSteps.ADDRESS_BOOK;
				gotoStep(AddressBookSteps.SHOW_ADDRESS);
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_CONTACT && nonNullish(currentContact)}
		<ShowContactStep
			onClose={handleClose}
			contact={currentContact}
			onEdit={(contact) => {
				currentContactId = contact.id;
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onAddAddress={() => {
				currentAddressIndex = undefined;
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
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
				onClose={handleClose}
				onEdit={(contact) => {
					currentContact = contact;
					gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
				}}
				onEditAddress={(index: number) => {
					currentAddressIndex = index;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
				onAddAddress={() => {
					currentAddressIndex = undefined;
					previousStepName = AddressBookSteps.SHOW_CONTACT;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
				onDeleteContact={() => {
					isDeletingContact = true;
				}}
				onDeleteAddress={(index) => {
					currentAddressIndex = index;
				}}
			/>
		</Responsive>
		<Responsive up="md">
			<EditContactStep
				contact={currentContact}
				onClose={handleClose}
				onEdit={(contact) => {
					currentContact = contact;
					gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
				}}
				onEditAddress={(index: number) => {
					currentAddressIndex = index;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
				onAddAddress={() => {
					currentAddressIndex = undefined;
					gotoStep(AddressBookSteps.EDIT_ADDRESS);
				}}
				onDeleteContact={confirmDeleteContact}
				onDeleteAddress={confirmDeleteAddress}
			/>
		</Responsive>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT_NAME}
		<EditContactNameStep
			bind:this={editContactNameStep}
			contact={currentContact}
			onAddContact={async (contact: Pick<ContactUi, 'name'>) => {
				await callCreateContact({ name: contact.name });
				gotoStep(AddressBookSteps.ADDRESS_BOOK);
			}}
			onSaveContact={async (contact: ContactUi) => {
				await callUpdateContact({ contact });
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}
			isNewContact={isNullish(currentContact)}
			onClose={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
		/>
	{:else if currentStep?.name === AddressBookSteps.EDIT_ADDRESS && nonNullish(currentContact)}
		<EditAddressStep
			contact={currentContact}
			address={nonNullish(currentAddressIndex)
				? currentContact?.addresses[currentAddressIndex]
				: undefined}
			onSaveAddress={handleSaveAddress}
			onAddAddress={handleAddAddress}
			isNewAddress={isNullish(currentAddressIndex)}
			onClose={() => {
				currentAddressIndex = undefined;
				handleClose();
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.DELETE_ADDRESS && nonNullish(currentContact) && nonNullish(currentAddressIndex)}
		<DeleteAddressConfirmContent
			onCancel={() => {
				currentAddressIndex = undefined;
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onDelete={() => nonNullish(currentAddressIndex) && handleDeleteAddress(currentAddressIndex)}
			address={currentContact.addresses[currentAddressIndex]}
			contact={currentContact}
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
			onCancel={() => {
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onDelete={handleDeleteContact}
			contact={currentContact}
		/>
	{/if}
</WizardModal>

{#if currentStep?.name === AddressBookSteps.EDIT_CONTACT && nonNullish(currentContact) && nonNullish(currentAddressIndex)}
	<DeleteAddressConfirmBottomSheet
		onCancel={() => (currentAddressIndex = undefined)}
		onDelete={() => nonNullish(currentAddressIndex) && handleDeleteAddress(currentAddressIndex)}
		address={currentContact.addresses[currentAddressIndex]}
		contact={currentContact}
	/>
{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT && nonNullish(currentContact) && isDeletingContact}
	<DeleteContactConfirmBottomSheet
		onCancel={() => {
			isDeletingContact = false;
		}}
		onDelete={() => {
			isDeletingContact = false;
			if (nonNullish(currentContact)) {
				handleDeleteContact(currentContact.id);
			}
		}}
		contact={currentContact}
	/>
{/if}
