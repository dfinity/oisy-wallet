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

	// TODO Use contact store and remove
	let contacts: ContactUi[] = $state([]);
	// TODO Use contact store and remove
	let currentContact: ContactUi | undefined = $state();
	// TODO Use contact store and remove
	let currentAddressIndex: number | undefined = $state();

	const gotoStep = (stepName: AddressBookSteps) => {
		if (nonNullish(modal)) {
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
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

	// TODO Use contact store and remove
	const deleteContact = (id: bigint) => {
		contacts = contacts.filter((contact) => contact.id !== id);
		currentContact = undefined;
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

	// TODO Use contact store and remove
	const addAddress = (address: ContactAddressUi) => {
		const addresses = [...currentContact!.addresses, address];
		currentAddressIndex = undefined;
		currentContact = {
			...currentContact!,
			addresses
		};
		saveContact(currentContact);
		gotoStep(AddressBookSteps.SHOW_CONTACT);
	};

	// TODO Use contact store and remove
	const saveAddress = (address: ContactAddressUi) => {
		const { addresses } = currentContact!;
		addresses[currentAddressIndex!] = { ...address };
		gotoStep(AddressBookSteps.SHOW_CONTACT);
	};

	// TODO Use contact store and remove
	const deleteAddress = (index: number) => {
		if (nonNullish(currentContact)) {
			const addresses = currentContact.addresses.filter((a, i) => i !== index);
			currentContact = {
				...currentContact,
				addresses
			};
			saveContact(currentContact);
			gotoStep(AddressBookSteps.SHOW_CONTACT);
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
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_CONTACT && nonNullish(currentContact)}
		<!-- TODO Remove ! from currentContact -->
		<ShowContactStep
			onClose={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
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
			onDeleteAddress={deleteAddress}
		/>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT_NAME}
		<EditContactNameStep
			bind:this={editContactNameStep}
			contact={currentContact}
			onAddContact={addContact}
			onSaveContact={saveContact}
			isNewContact={isNullish(currentContact)}
			onClose={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
		/>
	{:else if currentStep?.name === AddressBookSteps.SHOW_ADDRESS}
		<!-- TODO replace in https://github.com/dfinity/oisy-wallet/pull/6548 -->
		{JSON.stringify(currentContact?.addresses[currentAddressIndex!])}
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
			onSaveAddress={saveAddress}
			onAddAddress={addAddress}
			isNewAddress={isNullish(currentAddressIndex)}
			onClose={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
		/>
	{/if}
</WizardModal>
