<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import EditAddressStep from '$lib/components/address-book/EditAddressStep.svelte';
	import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
	import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
	import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';
	import { authIdentity } from '$lib/derived/auth.derived';
  import { contactsStore } from '$lib/stores/contacts.store';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { createContact, deleteContact, updateContact } from '$lib/services/manage-contacts.service';

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
			// TODO: Add i18n
			title: 'Edit Contact'
		},
		{
			name: AddressBookSteps.EDIT_CONTACT_NAME,
			title: $i18n.contact.form.add_new_contact
		},
		{
			name: AddressBookSteps.SHOW_ADDRESS,
			// TODO: Add i18n
			title: 'Show address'
		},
		{
			name: AddressBookSteps.EDIT_ADDRESS,
			// TODO: Add i18n
			title: 'Edit address'
		}
	] satisfies { name: AddressBookSteps; title: string }[] as WizardSteps;

	let currentStep: WizardStep | undefined = $state();
	let modal: WizardModal | undefined = $state();
	const close = () => modalStore.close();

	let currentStepName = $derived(currentStep?.name as AddressBookSteps | undefined);
	let editContactNameStep = $state<EditContactNameStep>();

	let currentContactId: bigint | undefined = $state();
	let currentAddressIndex: number | undefined = $state();

	let currentContact = $derived($contactsStore?.find(c => c.id === currentContactId));
	let contacts = $contactsStore;

	const gotoStep = (stepName: AddressBookSteps) => {
		if (nonNullish(modal)) {
			goToWizardStep({
				modal,
				steps,
				stepName
			});
		}
	};


	const handleCreateContact = async (name: string) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		await createContact({ name, identity: $authIdentity});
	}

	const handleUpdateContact = async (contact: ContactUi) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		await updateContact({ contact, identity: $authIdentity});
	}


	const handleDeleteContact = async (id: bigint) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		await deleteContact({id, identity: $authIdentity});
	}

	const handleDeleteAddress = async (index: number) => {
		if (isNullish(currentContact)) {
			console.error("No current contact in handleDeleteAddress")
			return;
		}

		const addresses = currentContact.addresses.filter((a, i) => i !== index);
		await handleUpdateContact({...currentContact, addresses });
	}

	const handleSaveAddress = async (address: ContactAddressUi) => {
		if (isNullish(currentContact)) {
			console.error("No current contact in handleSaveAddress")
			return;
		}
		if (isNullish(currentAddressIndex)) {
			console.error("No current addressIndex in handleSaveAddress")
			return;

		}

		const addresses = currentContact.addresses;
		addresses[currentAddressIndex] = { ...address };
		await handleUpdateContact({...currentContact, addresses });
	}

	const handleAddAddress = async (address: ContactAddressUi) => {
		if (isNullish(currentContact)) {
			console.error("No current contact in handleDeleteAddress")
			return;
		}

		const addresses = [...currentContact.addresses, address];
		await handleUpdateContact({...currentContact, addresses });
	}

</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	disablePointerEvents={true}
	testId={ADDRESS_BOOK_MODAL}
	on:nnsClose={close}
>
	<svelte:fragment slot="title"
		>{currentStepName === AddressBookSteps.EDIT_CONTACT_NAME && nonNullish(editContactNameStep)
			? editContactNameStep.title
			: (currentStep?.title ?? '')}</svelte:fragment
	>
	{#if isNullish(contacts)}
		Loading contacts...
	{:else if currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep
			{contacts}
			onShowContact={(contact) => {
				currentContactId = contact.id;
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}
			onAddContact={() => {
				currentContactId = undefined;
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_CONTACT && nonNullish(currentContact)}
		<!-- TODO Remove ! from currentContact -->
		<ShowContactStep
			onClose={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
			contact={currentContact}
			onEdit={(contact) => {
				currentContactId = contact.id;
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			onAddAddress={() => {
				currentAddressIndex = undefined;
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
			}}
			onShowAddress={(address) => {
				currentAddressIndex = address;
				gotoStep(AddressBookSteps.SHOW_ADDRESS);
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT && nonNullish(currentContact)}
		<EditContactStep
			contact={currentContact}
			onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
			onEdit={(contact) => {
				currentContactId = contact.id;
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
			onDeleteContact={handleDeleteContact}
			onDeleteAddress={handleDeleteAddress}
		/>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT_NAME}
		<EditContactNameStep
			bind:this={editContactNameStep}
			contact={currentContact}
			onCreateContact={handleCreateContact}
			onUpdateContact={handleUpdateContact}
			isNewContact={isNullish(currentContact)}
			onClose={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_ADDRESS && nonNullish(currentAddressIndex)}
		<!-- TODO replace in https://github.com/dfinity/oisy-wallet/pull/6548 -->
		{JSON.stringify(currentContact?.addresses[currentAddressIndex])}
		<!-- TODO replace in https://github.com/dfinity/oisy-wallet/pull/6548 -->
		<Button
			on:click={() => {
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}>BACK</Button
		>
	{:else if currentStep?.name === AddressBookSteps.EDIT_ADDRESS && nonNullish(currentContact)}
		<EditAddressStep
			contact={currentContact}
			address={nonNullish(currentAddressIndex)
				? currentContact?.addresses[currentAddressIndex]
				: undefined}
			onSaveAddress={handleSaveAddress}
			onAddAddress={handleAddAddress}
			isNewAddress={isNullish(currentAddressIndex)}
			onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
		/>
	{/if}
</WizardModal>
