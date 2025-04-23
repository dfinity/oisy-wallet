<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
	import { ADDRESS_BOOK_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Contact } from '$lib/types/contact';

	type StepName = 'addressBook';

	const steps: WizardSteps = [
		{
			name: 'addressBook',
			title: $i18n.address_book.text.title
		}
	] satisfies { name: StepName; title: string }[] as WizardSteps;

	let currentStep: WizardStep | undefined = $state();
	let modal: WizardModal | undefined = $state();
	let currentStepName = $derived(currentStep?.name as StepName);

	let contacts: Contact[] = $state([]);
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	disablePointerEvents={true}
	testId={ADDRESS_BOOK_MODAL}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStepName === 'addressBook'}
		<AddressBookStep {contacts}></AddressBookStep>
	{/if}
</WizardModal>
