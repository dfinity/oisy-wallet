<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { AddTokenStep } from '$lib/enums/steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ADD_TOKEN_STEPS } from '$lib/constants/steps.constants';
	import { i18n } from '$lib/stores/i18n.store';

	const steps: WizardSteps = [
		{
			name: 'Add',
			title: $i18n.tokens.text.add
		},
		{
			name: 'Review',
			title: $i18n.tokens.text.review
		},
		{
			name: 'Saving',
			title: $i18n.tokens.text.saving
		}
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
