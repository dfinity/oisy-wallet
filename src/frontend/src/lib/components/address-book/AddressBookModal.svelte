<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import EditContactStep from './EditContactStep.svelte';
	import ShowContactStep from './ShowContactStep.svelte';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Contact } from '$lib/types/contact';

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
			title: 'Edit contact'
		},
		{
			name: AddressBookSteps.EDIT_CONTACT_NAME,
			title: $i18n.contact.form.add_new_contact
		}
	] satisfies { name: AddressBookSteps; title: string }[] as WizardSteps;

	function gotoStep(name: AddressBookSteps) {
		const index = steps.findIndex((step) => step.name === name);
		if (index < 0) {
			throw new Error(`Step ${name} not found`);
		}
		modal?.set(index);
	}

	let currentStep: WizardStep | undefined = $state();
	let modal: WizardModal | undefined = $state();
	const close = () => modalStore.close();

	let currentStepName = $derived(currentStep?.name as AddressBookSteps | undefined);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let currentComponent = $state<any>();

	let contacts: Contact[] = $state([]);
	let currentContact: Contact | undefined = $state();

	function addContact(contact: Contact) {
		contact.id = `${Date.now()}`;
		contacts.push(contact);
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
	}

	function saveContact(contact: Contact) {
		const id = contacts.findIndex((c) => contact.id === c.id);
		contacts[id] = contact;
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
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
		>{currentComponent?.title ?? currentStep?.title ?? ''}</svelte:fragment
	>

	{#if currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep
			bind:this={currentComponent}
			{contacts}
			showContact={(contact) => {
				currentContact = contact;
				gotoStep(AddressBookSteps.SHOW_CONTACT);
			}}
			addContact={() => {
				currentContact = undefined;
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
		></AddressBookStep>
	{:else if currentStep?.name === AddressBookSteps.SHOW_CONTACT}
		<ShowContactStep
			contact={currentContact!}
			close={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
			edit={(contact) => {
				currentContact = contact;
				gotoStep(AddressBookSteps.EDIT_CONTACT);
			}}
		></ShowContactStep>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT}
		<EditContactStep
			contact={currentContact!}
			close={() => gotoStep(AddressBookSteps.SHOW_CONTACT)}
			edit={(contact) => {
				currentContact = contact;
				gotoStep(AddressBookSteps.EDIT_CONTACT_NAME);
			}}
		/>
	{:else if currentStep?.name === AddressBookSteps.EDIT_CONTACT_NAME}
		<EditContactNameStep
			bind:this={currentComponent}
			contact={currentContact}
			{addContact}
			{saveContact}
			close={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
		></EditContactNameStep>
	{/if}
</WizardModal>
