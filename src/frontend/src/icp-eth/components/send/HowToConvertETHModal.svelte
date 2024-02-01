<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { SendStep } from '$lib/enums/steps';
	import { modalStore } from '$lib/stores/modal.store';
	import { SEND_WIZARD_STEPS } from '$eth/constants/send.constants';
	import SendTokenWizard from '$eth/components/send/SendTokenWizard.svelte';
	import HowToConvertETHInfo from '$icp-eth/components/send/HowToConvertETHInfo.svelte';
	import ReceiveAddressQRCode from '$icp-eth/components/receive/ReceiveAddressQRCode.svelte';
	import { address } from '$lib/derived/address.derived';
	import { ICP_NETWORK } from '$lib/constants/networks.constants';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import type { Network } from '$lib/types/network';

	/**
	 * Props
	 */

	let destination = '';
	$: destination = $ckEthHelperContractAddressStore?.[ETHEREUM_TOKEN_ID]?.data ?? '';
	let network: Network | undefined = ICP_NETWORK;

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
		{
			name: 'QR code',
			title: 'Receive address'
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
		formCancelAction="back"
		on:icSendBack={() => modal.set(0)}
	>
		{#if currentStep?.name === steps[1].name}
			<ReceiveAddressQRCode address={$address ?? ''} on:icBack={modal.back} />
		{:else if currentStep?.name === steps[0].name}
			<HowToConvertETHInfo on:icQRCode={modal.next} on:icConvert={() => modal.set(2)} />
		{/if}
	</SendTokenWizard>
</WizardModal>
