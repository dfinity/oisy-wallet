<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import AddressBookInfoPage from '$lib/components/address-book/AddressBookInfoPage.svelte';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import EditAddressStep from '$lib/components/address-book/EditAddressStep.svelte';
	import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
	import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
	import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
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
	let previousStep: AddressBookSteps | undefined = $state();
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
		if (
			currentStepName === AddressBookSteps.SHOW_ADDRESS &&
			previousStepName === AddressBookSteps.SHOW_CONTACT
		) {
			return gotoStep(AddressBookSteps.SHOW_CONTACT);
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
	<svelte:fragment slot="title">
		{#if currentStepName === AddressBookSteps.SHOW_ADDRESS}
			<div class="flex flex-wrap items-center gap-2">
				<Avatar
					name={currentContact?.name}
					variant="xs"
					styleClass="rounded-full flex items-center justify-center"
				/>
				<div class="text-center text-lg font-semibold text-primary">
					{currentContact?.name}
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
				previousStep = AddressBookSteps.ADDRESS_BOOK;
				gotoStep(AddressBookSteps.SHOW_ADDRESS);
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
			onShowAddress={(addressIndex) => {
				currentAddressIndex = addressIndex;
				previousStep = AddressBookSteps.SHOW_CONTACT;
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
	{:else if currentStep?.name === AddressBookSteps.SHOW_ADDRESS}
		<AddressBookInfoPage
			address={nonNullish(currentAddressIndex)
				? currentContact?.addresses[currentAddressIndex]
				: undefined}
			onClose={(step) => gotoStep(step ?? AddressBookSteps.SHOW_CONTACT)}
			{previousStep}
		/>
	{/if}
</WizardModal>
