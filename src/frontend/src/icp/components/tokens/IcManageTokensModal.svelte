<script lang="ts">
	import { AddTokenStep } from '$lib/enums/steps';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import IcManageTokensForm from '$icp/components/tokens/IcManageTokensForm.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import IcManageTokensReview from '$icp/components/tokens/IcManageTokensReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { addTokenSteps } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';

	const steps: WizardSteps = [
		{
			name: 'Manage',
			title: $i18n.tokens.manage.title
		},
		{
			name: 'Import',
			title: $i18n.tokens.import.title
		},
		{
			name: 'Review',
			title: $i18n.tokens.import.review
		},
		{
			name: 'Saving',
			title: $i18n.tokens.import.saving
		}
	];

	let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const save = async () => {};

	const close = () => {
		modalStore.close();

		saveProgressStep = AddTokenStep.INITIALIZATION;
	};

	let ledgerCanisterId = '';
	let indexCanisterId = '';
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Saving'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		<IcManageTokensReview
			on:icBack={modal.back}
			on:icSave={save}
			{ledgerCanisterId}
			{indexCanisterId}
		/>
	{:else if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={addTokenSteps($i18n)} />
	{:else if currentStep?.name === 'Import'}
		<IcAddTokenForm
			on:icBack={modal.back}
			on:icNext={modal.next}
			bind:ledgerCanisterId
			bind:indexCanisterId
		/>
	{:else}
		<IcManageTokensForm on:icSave on:icClose={close} on:icAddToken={modal.next} />
	{/if}
</WizardModal>
