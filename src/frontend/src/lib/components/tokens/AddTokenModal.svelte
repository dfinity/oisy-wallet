<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';

    import {AddTokenStep} from "$lib/enums/steps";

	const steps: WizardSteps = [
		{
			name: 'Add',
			title: 'Add token'
		},
		{
			name: 'Review',
			title: 'Review'
		},
		{
			name: 'Saving',
			title: 'Saving...'
		}
	];

	let sendProgressStep: string = AddTokenStep.INITIALIZATION;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		sendProgressStep = AddTokenStep.INITIALIZATION;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>
</WizardModal>
