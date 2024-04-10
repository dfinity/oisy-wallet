<script lang="ts">
	import {
		type ProgressStep,
		WizardModal,
		type WizardStep,
		type WizardSteps
	} from '@dfinity/gix-components';
	import { AddTokenStep } from '$lib/enums/steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const steps: WizardSteps = [
		{
			name: 'Add',
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

	const ADD_TOKEN_STEPS: [ProgressStep, ...ProgressStep[]] = [
		{
			step: AddTokenStep.INITIALIZATION,
			text: $i18n.tokens.text.initializing,
			state: 'in_progress'
		} as ProgressStep,
		{
			step: AddTokenStep.SAVE,
			text: $i18n.tokens.import.saving,
			state: 'next'
		} as ProgressStep,
		{
			step: AddTokenStep.UPDATE_UI,
			text: $i18n.tokens.text.updating_ui,
			state: 'next'
		} as ProgressStep
	];

	export let saveProgressStep: string = AddTokenStep.INITIALIZATION;

	export let currentStep: WizardStep | undefined;
	export let modal: WizardModal;
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose
	disablePointerEvents={currentStep?.name === 'Saving'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Saving'}
		<InProgressWizard progressStep={saveProgressStep} steps={ADD_TOKEN_STEPS} />
	{:else}
		<slot />
	{/if}
</WizardModal>
