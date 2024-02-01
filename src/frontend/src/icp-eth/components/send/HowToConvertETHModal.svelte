<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { Network } from '$lib/types/network';
	import { SendStep } from '$lib/enums/steps';
	import { modalStore } from '$lib/stores/modal.store';
	import { SEND_WIZARD_STEPS } from '$eth/constants/send.constants';
	import SendTokenWizard from '$eth/components/send/SendTokenWizard.svelte';
	import HowToConvertETHInfo from '$icp-eth/components/send/HowToConvertETHInfo.svelte';

	/**
	 * Props
	 */

	let destination = '';
	let network: Network | undefined = undefined;

	let amount: number | undefined = undefined;
	let sendProgressStep: string = SendStep.INITIALIZATION;

	/**
	 * Wizard modal
	 */

	let steps: WizardSteps;
	$: steps = [
		{
			name: 'Info',
			title: 'How to convert ETH to ckETH'
		},
		...SEND_WIZARD_STEPS
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
	>
		<HowToConvertETHInfo />
	</SendTokenWizard>
</WizardModal>
