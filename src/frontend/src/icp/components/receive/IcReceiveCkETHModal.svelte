<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { SendStep } from '$lib/enums/steps';
	import HowToConvertETHInfo from '$icp/components/convert/HowToConvertETHInfo.svelte';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ETHEREUM_TOKEN_ID } from '$icp-eth/constants/tokens.constants';
	import type { Network } from '$lib/types/network';
	import ConvertETHToCkETHWizard from '$icp-eth/components/send/ConvertETHToCkETHWizard.svelte';
	import { HOW_TO_CONVERT_WIZARD_STEPS } from '$icp-eth/constants/how-to-convert.constants';
	import IcReceiveInfoCkETH from '$icp/components/receive/IcReceiveInfoCkETH.svelte';
	import ReceiveAddressQRCode from '$icp-eth/components/receive/ReceiveAddressQRCode.svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { closeModal } from '$lib/utils/modal.utils';
	import { ICP_NETWORK } from '$icp-eth/constants/networks.constants';

	/**
	 * Props
	 */

	let destination = '';
	$: destination = $ckEthHelperContractAddressStore?.[ETHEREUM_TOKEN_ID]?.data ?? '';

	let targetNetwork: Network | undefined = ICP_NETWORK;

	let amount: number | undefined = undefined;
	let sendProgressStep: string = SendStep.INITIALIZATION;

	/**
	 * Wizard modal
	 */

	let steps: WizardSteps;
	$: steps = [
		{
			name: 'Receive',
			title: 'Receive'
		},
		{
			name: 'QR Code',
			title: 'Receive address'
		},
		...HOW_TO_CONVERT_WIZARD_STEPS
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			targetNetwork = undefined;

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
		on:icSendBack={() => modal.set(2)}
		bind:destination
		bind:targetNetwork
		bind:amount
		bind:sendProgressStep
		{currentStep}
	>
		{#if currentStep?.name === HOW_TO_CONVERT_WIZARD_STEPS[0].name}
			<HowToConvertETHInfo
				on:icBack={() => modal.set(0)}
				on:icQRCode={modal.next}
				on:icConvert={() => modal.set(4)}
			/>
		{:else if currentStep?.name === steps[1].name}
			<ReceiveAddressQRCode on:icBack={modal.back} address={$icrcAccountIdentifierText ?? ''} />
		{:else}
			<IcReceiveInfoCkETH on:icQRCode={modal.next} on:icConvert={() => modal.set(2)} />
		{/if}
	</ConvertETHToCkETHWizard>
</WizardModal>
