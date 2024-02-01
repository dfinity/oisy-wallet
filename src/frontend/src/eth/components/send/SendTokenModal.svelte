<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { getContext } from 'svelte';
	import type { Network } from '$lib/types/network';
	import { SEND_CONTEXT_KEY, type SendContext } from '$eth/stores/send.store';
	import SendTokenWizard from '$eth/components/send/SendTokenWizard.svelte';
	import { SendStep } from '$lib/enums/steps';
	import { SEND_WIZARD_STEPS } from '$eth/constants/send.constants';

	/**
	 * Props
	 */

	export let destination = '';
	export let network: Network | undefined = undefined;

	let amount: number | undefined = undefined;
	let sendProgressStep: string = SendStep.INITIALIZATION;

	/**
	 * Send context store
	 */

	const { sendPurpose } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Wizard modal
	 */

	const [firstStep, ...otherSteps] = SEND_WIZARD_STEPS;

	let steps: WizardSteps;
	$: steps = [
		{
			...firstStep,
			title: sendPurpose === 'convert-eth-to-cketh' ? 'Convert ETH to ckETH' : 'Send'
		},
		...otherSteps
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => {
		modalStore.close();

		destination = '';
		amount = undefined;
		network = undefined;

		sendProgressStep = SendStep.INITIALIZATION;
	};
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Sending'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	<SendTokenWizard
		{currentStep}
		bind:destination
		bind:network
		bind:amount
		bind:sendProgressStep
		on:icBack={modal.back}
		on:icNext={modal.next}
		on:icClose={close}
	/>
</WizardModal>
