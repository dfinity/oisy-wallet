<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { ICP_NETWORK } from '$env/networks.env';
	import { ICP_TOKEN } from '$env/tokens.env';
	import HowToConvertEthereumInfo from '$icp/components/convert/HowToConvertEthereumInfo.svelte';
	import IcReceiveInfoCkEthereum from '$icp/components/receive/IcReceiveInfoCkEthereum.svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import ConvertETHToCkETHWizard from '$icp-eth/components/send/ConvertETHToCkETHWizard.svelte';
	import { howToConvertWizardSteps } from '$icp-eth/config/how-to-convert.config';
	import {
		ckEthereumNativeToken,
		ckEthereumNativeTokenId,
		ckEthereumTwinToken,
		ckEthereumTwinTokenStandard
	} from '$icp-eth/derived/cketh.derived';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import {
		toCkErc20HelperContractAddress,
		toCkEthHelperContractAddress
	} from '$icp-eth/utils/cketh.utils';
	import ReceiveAddressQRCode from '$lib/components/receive/ReceiveAddressQRCode.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import { closeModal } from '$lib/utils/modal.utils';

	/**
	 * Props
	 */

	let destination = '';
	$: destination =
		$ckEthereumTwinTokenStandard === 'erc20'
			? (toCkErc20HelperContractAddress($ckEthMinterInfoStore?.[$ckEthereumNativeTokenId]) ?? '')
			: (toCkEthHelperContractAddress({
					minterInfo: $ckEthMinterInfoStore?.[$ckEthereumNativeTokenId],
					networkId: $ckEthereumNativeToken.network.id
				}) ?? '');

	let targetNetwork: Network | undefined = ICP_NETWORK;

	let amount: number | undefined = undefined;
	let sendProgressStep: string = ProgressStepsSend.INITIALIZATION;

	/**
	 * Wizard modal
	 */

	let howToSteps: WizardSteps;
	$: howToSteps = howToConvertWizardSteps({ i18n: $i18n, twinToken: $ckEthereumTwinToken });

	let steps: WizardSteps;
	$: steps = [
		{
			name: 'Receive',
			title: $i18n.receive.text.receive
		},
		{
			name: 'QR Code',
			title: $i18n.receive.text.address
		},
		...howToSteps
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			targetNetwork = undefined;

			sendProgressStep = ProgressStepsSend.INITIALIZATION;

			currentStep = undefined;

			dispatch('nnsClose');
		});
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === WizardStepsSend.SENDING}
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
		{#if currentStep?.name === howToSteps[0].name}
			<HowToConvertEthereumInfo
				on:icBack={() => modal.set(0)}
				on:icQRCode={modal.next}
				on:icConvert={() => modal.set(4)}
			/>
		{:else if currentStep?.name === steps[1].name}
			<ReceiveAddressQRCode
				on:icBack={modal.back}
				address={$icrcAccountIdentifierText ?? ''}
				addressToken={ICP_TOKEN}
			/>
		{:else}
			<IcReceiveInfoCkEthereum on:icQRCode={modal.next} on:icConvert={() => modal.set(2)} />
		{/if}
	</ConvertETHToCkETHWizard>
</WizardModal>
