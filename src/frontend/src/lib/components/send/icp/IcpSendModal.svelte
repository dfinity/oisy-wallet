<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import type { WizardSteps } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { SendStep } from '$lib/enums/steps';
	import { SEND_STEPS } from '$lib/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import IcpSendForm from '$lib/components/send/icp/IcpSendForm.svelte';
	import IcpSendReview from '$lib/components/send/icp/IcpSendReview.svelte';

	/**
	 * Props
	 */

	let destination = '';
	let amount: number | undefined = undefined;

	/**
	 * Send
	 */

	let sendProgressStep: string = SendStep.INITIALIZATION;

	const send = async () => {};

	const steps: WizardSteps = [
		{
			name: 'Send',
			title: 'Send'
		},
		{
			name: 'Review',
			title: 'Review'
		},
		{
			name: 'Sending',
			title: 'Sending...'
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		destination = '';
		amount = undefined;

		sendProgressStep = SendStep.INITIALIZATION;
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	{#if currentStep?.name === 'Review'}
		<IcpSendReview on:icBack={modal.back} on:icSend={send} {destination} {amount} />
	{:else if currentStep?.name === 'Sending'}
		<InProgressWizard progressStep={sendProgressStep} steps={SEND_STEPS} />
	{:else}
		<IcpSendForm on:icNext={modal.next} on:icClose={close} bind:destination bind:amount />
	{/if}
</WizardModal>
