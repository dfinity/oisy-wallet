<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import EditAddressStep from '$lib/components/address-book/EditAddressStep.svelte';
	import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
	import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
	import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
	import ShowQrCodeStep from '$lib/components/address-book/ShowQrCodeStep.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Address, Contact } from '$lib/types/contact';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';
	import Avatar from '$lib/components/contact/Avatar.svelte';

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
			title: $i18n.contact.form.edit_contact
		},
		{
			name: AddressBookSteps.EDIT_CONTACT_NAME,
			title: $i18n.contact.form.add_new_contact
		},
		{
			name: AddressBookSteps.SHOW_ADDRESS,
			title: 'Show address'
		},
		{
			name: AddressBookSteps.EDIT_ADDRESS,
			title: 'Edit address'
		},
		{
			name: AddressBookSteps.SHOW_QR_CODE,
			title: 'Scan QR Code'
		}
	] satisfies { name: AddressBookSteps; title: string }[] as WizardSteps;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal | undefined;
	const close = () => modalStore.close();

	let currentContact: Contact | undefined;
	let currentAddress: Address | undefined;
	let editContactNameStep: EditContactNameStep;

	$: currentStepName = currentStep?.name as AddressBookSteps | undefined;

	let contacts: Contact[] = [
		{
			id: 'pf',
			name: 'Peter Fox',
			addresses: [{ id: 'f1', address_type: 'ETH', address: 'xxxxxxx', alias: 'Private' }]
		}
	];

	const gotoStep = (stepName: AddressBookSteps) => {
		if (nonNullish(modal)) {
			goToWizardStep({
				modal,
				steps,
				stepName
			});
		}
	};

	const addContact = (contact: Contact) => {
		currentContact = {
			...contact,
			id: `${Date.now()}`
		};
		contacts = [...contacts, currentContact];
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

	const saveContact = (contact: Contact) => {
		const index = contacts.findIndex((c) => contact.id === c.id);
		if (index !== -1) {
			contacts[index] = contact;
		}
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

	const deleteContact = (id: string) => {
		contacts = contacts.filter((contact) => contact.id !== id);
		currentContact = undefined;
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	};

	const addAddress = (address: Partial<Address>) => {
		currentAddress = {
			...address,
			id: `${Date.now()}`
		} as Address;
		const addresses = [...currentContact!.addresses, currentAddress];
		currentContact = {
			...currentContact!,
			addresses
		};
		saveContact(currentContact);
		gotoStep(AddressBookSteps.SHOW_CONTACT);
	};

	const saveAddress = (address: Address) => {
		const { addresses } = currentContact!;
		const index = addresses.findIndex((a) => address.id === a.id);
		if (index !== -1) {
			addresses[index] = { ...address };
		}
		gotoStep(AddressBookSteps.SHOW_CONTACT);
	};

	const deleteAddress = (id: string) => {
		if (nonNullish(currentContact)) {
			const updatedAddresses = currentContact.addresses.filter((address) => address.id !== id);
			currentContact = {
				...currentContact,
				addresses: updatedAddresses
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
<svelte:fragment slot="title">
	{#if currentStepName === AddressBookSteps.SHOW_QR_CODE && currentContact}
		<div class="flex flex-wrap gap-2 items-center">
			<Avatar
				name={currentContact.name}
				variant="lg"
				styleClass="bg-accent text-white text-lg font-bold w-12 h-12 rounded-full flex items-center justify-center mb-2"
			/>
			<div class="text-lg font-semibold text-primary text-center">
				{currentContact.name}
			</div>
		</div>
	{:else if currentStepName === AddressBookSteps.EDIT_CONTACT_NAME && nonNullish(editContactNameStep)}
		{editContactNameStep.title}
	{:else}
		{currentStep?.title ?? ''}
	{/if}
</svelte:fragment>


	{#if currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep
			{contacts}
			showContact={(contact) => {
				currentContact = contact;
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}
			addContact={() => {
				currentContact = undefined;
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
		/>
	{:else if currentStepName === AddressBookSteps.SHOW_CONTACT}
		<ShowContactStep
			close={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
			contact={currentContact!}
			edit={(contact) => {
				currentContact = contact;
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
			addAddress={() => {
				currentAddress = undefined;
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
			}}
			showQrCode={(address) => {
				currentAddress = address;
				gotoStep(AddressBookSteps.SHOW_QR_CODE);
			}}
		/>
	{:else if currentStepName === AddressBookSteps.SHOW_QR_CODE}
		{#if currentAddress}
			<ShowQrCodeStep
				address={currentAddress}
				addressLabel={currentAddress.alias}
				close={() => modalStore.close()}
			/>
		{:else}
			<p class="text-red-600">No address selected</p>
		{/if}
	{:else if currentStepName === AddressBookSteps.EDIT_CONTACT}
		<EditContactStep
			contact={currentContact!}
			close={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
			edit={(contact) => {
				currentContact = contact;
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
			editAddress={(address) => {
				currentAddress = address;
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
			}}
			addAddress={() => {
				currentAddress = undefined;
				gotoStep(AddressBookSteps.EDIT_ADDRESS);
			}}
			{deleteContact}
			{deleteAddress}
		/>
	{:else if currentStepName === AddressBookSteps.EDIT_CONTACT_NAME}
		<EditContactNameStep
			bind:this={editContactNameStep}
			contact={currentContact}
			{addContact}
			{saveContact}
			close={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
		/>
	{:else if currentStepName === AddressBookSteps.SHOW_ADDRESS}
		{JSON.stringify(currentAddress)}
		<Button on:click={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}>back</Button>
	{:else if currentStepName === AddressBookSteps.EDIT_ADDRESS}
		<EditAddressStep
			contact={currentContact!}
			address={currentAddress}
			{saveAddress}
			{addAddress}
			close={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
		/>
	{/if}
</WizardModal>
