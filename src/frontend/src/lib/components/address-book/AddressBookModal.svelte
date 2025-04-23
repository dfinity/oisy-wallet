<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import AddContactStep from '$lib/components/address-book/AddContactStep.svelte';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Contact } from '$lib/types/contact';

	type StepName = 'addressBook' | 'addContact';

	const steps: WizardSteps = [
		{
			name: 'addressBook',
			title: $i18n.address_book.text.title
		},
		{
			name: 'addContact',
			title: $i18n.contact.form.add_new_contact
		}
	] satisfies { name: StepName; title: string }[] as WizardSteps;

	function gotoStep(name: StepName) {
		const index = steps.findIndex((step) => step.name === name);
		if (index < 0) {
			throw new Error(`Step ${name} not found`);
		}
		modal?.set(index);
	}

	let currentStep: WizardStep | undefined = $state();
	let modal: WizardModal | undefined = $state();
	let currentStepName = $derived(currentStep?.name as StepName);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let currentComponent = $state<any>();

	let contacts: Contact[] = $state([]);

	function addContact(contact: Contact) {
		contacts.push(contact);
		gotoStep('addressBook');
	}
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	disablePointerEvents={true}
	testId={ADDRESS_BOOK_MODAL}
>
	<svelte:fragment slot="title"
		>{currentComponent?.title ?? currentStep?.title ?? ''}</svelte:fragment
	>

	{#if currentStepName === 'addressBook'}
		<AddressBookStep
			bind:this={currentComponent}
			{contacts}
			addContact={() => gotoStep('addContact')}
		></AddressBookStep>
	{:else if currentStep?.name === 'addContact'}
		<AddContactStep bind:this={currentComponent} {addContact} close={() => gotoStep('addressBook')}
		></AddContactStep>
	{/if}
</WizardModal>
