<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';

	import { AddTokenStep } from '$lib/enums/steps';
	import AddTokenForm from '$lib/components/tokens/AddTokenForm.svelte';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import SendReview from "$lib/components/send/SendReview.svelte";
	import AddTokenReview from "$lib/components/tokens/AddTokenReview.svelte";
	import {isNullishOrEmpty} from "$lib/utils/input.utils";
	import {toastsError} from "$lib/stores/toasts.store";

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

	let contractAddress = '';

	const save = () => {
		if (isNullishOrEmpty(contractAddress)) {
			toastsError({
				msg: { text: `Contract address is invalid.` }
			});
			return;
		}

		modal.next();
	}
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		<AddTokenReview on:icBack={modal.back} on:icSave={save} {contractAddress} />
	{:else if currentStep?.name === 'Saving'}{:else}
		<AddTokenForm on:icNext={modal.next} on:icClose={close} bind:contractAddress />
	{/if}
</WizardModal>
