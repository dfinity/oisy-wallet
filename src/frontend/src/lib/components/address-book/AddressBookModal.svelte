<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import AddContactStep from '$lib/components/address-book/AddContactStep.svelte';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Contact } from '$lib/types/contact';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	const steps: WizardSteps = [
		{
			name: AddressBookSteps.ADDRESS_BOOK,
			title: $i18n.address_book.text.title
		},
		{
			name: AddressBookSteps.ADD_CONTACT,
			title: $i18n.contact.form.add_new_contact
		}
	] satisfies { name: AddressBookSteps; title: string }[] as WizardSteps;

	let currentStep: WizardStep | undefined = $state();
	let modal: WizardModal | undefined = $state();
	const close = () => modalStore.close();

	let currentStepName = $derived(currentStep?.name as AddressBookSteps | undefined);
	let addContactStep = $state<AddContactStep>();

	let contacts: Contact[] = $state([]);

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
		contacts = [...contacts, contact];
		gotoStep(AddressBookSteps.ADDRESS_BOOK);
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
		>{currentStepName === AddressBookSteps.ADD_CONTACT && nonNullish(addContactStep)
			? addContactStep.title
			: (currentStep?.title ?? '')}</svelte:fragment
	>

	{#if currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep {contacts} addContact={() => gotoStep(AddressBookSteps.ADD_CONTACT)}
		></AddressBookStep>
	{:else if currentStep?.name === AddressBookSteps.ADD_CONTACT}
		<AddContactStep
			bind:this={addContactStep}
			{addContact}
			close={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
		></AddContactStep>
	{/if}
</WizardModal>
