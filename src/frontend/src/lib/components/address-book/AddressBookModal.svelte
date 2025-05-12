<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import AddContactStep from '$lib/components/address-book/AddContactStep.svelte';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import AddressBookInfoPage from '$lib/components/address-book/AddressBookInfoPage.svelte';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { Contact } from '$lib/types/contact';
	import type { Address } from '$lib/types/contact';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	const steps: WizardSteps = [
		{
			name: AddressBookSteps.ADDRESS_BOOK,
			title: $i18n.address_book.text.title
		},
		{
			name: AddressBookSteps.ADD_CONTACT,
			title: $i18n.contact.form.add_new_contact
		},
		{
			name: AddressBookSteps.INFO_PAGE,
			title: 'Contanc Info Pages'
		}
	] satisfies { name: AddressBookSteps; title: string }[] as WizardSteps;

	let currentStep: WizardStep | undefined = $state();
	let modal: WizardModal | undefined = $state();
	const close = () => modalStore.close();

	let currentStepName = $derived(currentStep?.name as AddressBookSteps | undefined);
	let addContactStep = $state<AddContactStep>();

	let contacts: Contact[] = $state([]);
	let currentContact: Contact | undefined = $state();
	let currentAddress: Address | undefined = $state();

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
	<svelte:fragment slot="title">
			{#if currentStepName === AddressBookSteps.INFO_PAGE}
				<div class="flex flex-wrap gap-2 items-center">
					<Avatar
						variant="xs"
						styleClass="rounded-full flex items-center justify-center mb-2"
					/>
					<div class="text-lg font-semibold text-primary text-center">
						{currentContact?.name}
					</div>
				</div>
			{:else if currentStepName === AddressBookSteps.ADD_CONTACT && nonNullish(addContactStep)}
				{addContactStep.title}
			{:else}
				{currentStep?.title ?? ''}
			{/if}
	</svelte:fragment>

	{#if currentStepName === AddressBookSteps.ADDRESS_BOOK}
		<AddressBookStep {contacts} addContact={() => gotoStep(AddressBookSteps.ADD_CONTACT)}
		></AddressBookStep>
	{:else if currentStep?.name === AddressBookSteps.INFO_PAGE}
		<AddressBookInfoPage
			address={currentAddress ?? { address: '', address_type: 'Eth' }}
			close={() => modalStore.close()}
		/>
	{:else if currentStep?.name === AddressBookSteps.ADD_CONTACT}
		<AddContactStep
			bind:this={addContactStep}
			{addContact}
			close={() => gotoStep(AddressBookSteps.ADDRESS_BOOK)}
		></AddContactStep>
	{/if}
</WizardModal>
