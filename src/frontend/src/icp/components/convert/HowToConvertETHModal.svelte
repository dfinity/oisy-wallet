<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { SendStep } from '$lib/enums/steps';
	import HowToConvertETHInfo from '$icp/components/convert/HowToConvertETHInfo.svelte';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ETHEREUM_TOKEN_ID } from '$icp-eth/constants/tokens.constants';
	import type { Network } from '$lib/types/network';
	import ConvertETHToCkETHWizard from '$icp-eth/components/send/ConvertETHToCkETHWizard.svelte';
	import { HOW_TO_CONVERT_WIZARD_STEPS } from '$icp-eth/constants/how-to-convert.constants';
	import { closeModal } from '$lib/utils/modal.utils';
	import { ICP_NETWORK } from '$icp-eth/constants/networks.constants';

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
	$: steps = HOW_TO_CONVERT_WIZARD_STEPS;

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			network = undefined;

			sendProgressStep = SendStep.INITIALIZATION;

			currentStep = undefined;
		});
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Sending'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	<ConvertETHToCkETHWizard
		on:icBack={modal.back}
		on:icNext={modal.next}
		on:icClose={close}
		on:icSendBack={() => modal.set(0)}
		bind:destination
		bind:network
		bind:amount
		bind:sendProgressStep
		{currentStep}
	>
		<HowToConvertETHInfo
			on:icQRCode={modal.next}
			on:icConvert={() => modal.set(2)}
			formCancelAction="close"
		/>
	</ConvertETHToCkETHWizard>
</WizardModal>
