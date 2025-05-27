<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import DeleteAddressConfirmBottomSheet from '$lib/components/address-book/DeleteAddressConfirmBottomSheet.svelte';
	import DeleteAddressConfirmContent from '$lib/components/address-book/DeleteAddressConfirmContent.svelte';
	import EditAddressStep from '$lib/components/address-book/EditAddressStep.svelte';
	import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
	import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
	import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

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

	// TODO Use contact store and remove
	let contacts: ContactUi[] = $state([]);
	// TODO Use contact store and remove
	let currentContact: ContactUi | undefined = $state();
	// TODO Use contact store and remove
	let currentAddressIndex: number | undefined = $state();

	const handleClose = () => {
		if (nonNullish(previousStepName)) {
			return gotoStep(previousStepName);
		}
		return gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

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

	// TODO Use contact store and remove
	const addContact = (contact: Pick<ContactUi, 'name'>) => {
		currentContact = {
			id: BigInt(Date.now()),
			...contact,
			updateTimestampNs: BigInt(Date.now()),
			addresses: []
		};
		contacts = [...contacts, currentContact];
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

	// TODO Use contact store and remove
	const saveContact = (contact: ContactUi) => {
		const index = contacts.findIndex((c) => contact.id === c.id);
		contacts[index] = contact;
	};

	// TODO Use contact store and remove
	const deleteContact = (id: bigint) => {
		contacts = contacts.filter((contact) => contact.id !== id);
		currentContact = undefined;
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

	// TODO Use contact store and remove
	const addAddress = (address: ContactAddressUi) => {
		if (isNullish(currentContact)) {
			return;
		}

		const addresses = [...currentContact.addresses, address];
		currentAddressIndex = undefined;
		currentContact = {
			...currentContact,
			addresses
		};
		saveContact(currentContact);
		gotoStep(AddressBookSteps.SHOW_CONTACT);
	};

	// TODO Use contact store and remove
	const saveAddress = (address: ContactAddressUi) => {
		if (isNullish(currentContact) || isNullish(currentAddressIndex)) {
			return;
		}

		const { addresses } = currentContact;
		addresses[currentAddressIndex] = { ...address };
		currentAddressIndex = undefined;
		gotoStep(AddressBookSteps.SHOW_CONTACT);
	};

	const confirmDeleteAddress = (index: number) => {
		if (nonNullish(currentContact)) {
			currentAddressIndex = index;
			gotoStep(AddressBookSteps.DELETE_ADDRESS);
		}
	};

	// TODO Use contact store and remove
	const deleteAddress = (index: number) => {
		if (nonNullish(currentContact)) {
			const addresses = currentContact.addresses.filter((a, i) => i !== index);
			currentContact = {
				...currentContact,
				addresses
			};
			currentAddressIndex = undefined;
			saveContact(currentContact);
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
	<svelte:fragment slot="title"
		>{currentStepName === AddressBookSteps.EDIT_CONTACT_NAME && nonNullish(editContactNameStep)
			? editContactNameStep.title
			: (currentStep?.title ?? '')}</svelte:fragment
	>
	{#if currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep
			{contacts}
			onShowContact={(contact) => {
				currentContact = contact;
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}
			onAddContact={() => {
				currentContact = undefined;
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
			onShowAddress={({ contact, addressIndex }) => {
				currentContact = contact;
				currentAddressIndex = addressIndex;
				gotoStep(AddressBookSteps.SHOW_ADDRESS);
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_CONTACT && nonNullish(currentContact)}
		<ShowContactStep
			onClose={handleClose}
			contact={currentContact}
			onEdit={(contact) => {
				currentContact = contact;
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
		<!-- TODO find a better way to render EditContactStep with different onDeleteAddress functions -->
		<Responsive down="sm">
			<EditContactStep
				contact={currentContact}
				onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
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
				onDeleteContact={deleteContact}
				onDeleteAddress={(index) => {
					currentAddressIndex = index;
				}}
			/>
		</Responsive>
		<Responsive up="md">
			<EditContactStep
				contact={currentContact}
				onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
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
				onDeleteContact={deleteContact}
				onDeleteAddress={confirmDeleteAddress}
			/>
		</Responsive>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT_NAME}
		<EditContactNameStep
			bind:this={editContactNameStep}
			contact={currentContact}
			onAddContact={addContact}
			onSaveContact={saveContact}
			isNewContact={isNullish(currentContact)}
			onClose={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_ADDRESS && nonNullish(currentAddressIndex)}
		<!-- TODO replace in https://github.com/dfinity/oisy-wallet/pull/6548 -->
		{JSON.stringify(currentContact?.addresses[currentAddressIndex])}
		<!-- TODO replace in https://github.com/dfinity/oisy-wallet/pull/6548 -->
		<Button on:click={() => handleClose()}>BACK</Button>
	{:else if currentStep?.name === AddressBookSteps.EDIT_ADDRESS && nonNullish(currentContact)}
		<EditAddressStep
			contact={currentContact}
			address={nonNullish(currentAddressIndex)
				? currentContact?.addresses[currentAddressIndex]
				: undefined}
			onSaveAddress={saveAddress}
			onAddAddress={addAddress}
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
			onDelete={() => nonNullish(currentAddressIndex) && deleteAddress(currentAddressIndex)}
			address={currentContact.addresses[currentAddressIndex]}
			contact={currentContact}
		/>
	{/if}
</WizardModal>

{#if currentStep?.name === AddressBookSteps.EDIT_CONTACT && nonNullish(currentContact) && nonNullish(currentAddressIndex)}
	<DeleteAddressConfirmBottomSheet
		onCancel={() => (currentAddressIndex = undefined)}
		onDelete={() => nonNullish(currentAddressIndex) && deleteAddress(currentAddressIndex)}
		address={currentContact.addresses[currentAddressIndex]}
		contact={currentContact}
	/>
{/if}
