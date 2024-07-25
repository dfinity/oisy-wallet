<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import type { WizardSteps } from '@dfinity/gix-components';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import type { NetworkId } from '$lib/types/network';
	import { createEventDispatcher } from 'svelte';
	import { closeModal } from '$lib/utils/modal.utils';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { ckEthereumTwinToken } from '$icp-eth/derived/cketh.derived';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { icSendWizardStepsWithQrCodeScan } from '$icp/config/ic-send.config';
	import { goToWizardSendStep } from '$lib/utils/wizard-modal.utils';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';

	/**
	 * Props
	 */

	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	let amount: number | undefined = undefined;

	/**
	 * Send
	 */

	let sendProgressStep: string = ProgressStepsSendIc.INITIALIZATION;

	let firstStep: WizardStep;
	let otherSteps: WizardStep[];
	$: [firstStep, ...otherSteps] = icSendWizardStepsWithQrCodeScan($i18n);

	let steps: WizardSteps;
	$: steps = [
		{
			...firstStep,
			title: isNetworkIdBitcoin(networkId)
				? $i18n.convert.text.convert_to_btc
				: isNetworkIdEthereum(networkId)
					? replacePlaceholders($i18n.convert.text.convert_to_token, {
							$token: $ckEthereumTwinToken.symbol
						})
					: $i18n.send.text.send
		},
		...otherSteps
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			networkId = undefined;

			sendProgressStep = ProgressStepsSendIc.INITIALIZATION;

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

	<IcSendTokenWizard
		{currentStep}
		bind:destination
		bind:networkId
		bind:amount
		bind:sendProgressStep
		on:icBack={modal.back}
		on:icNext={modal.next}
		on:icClose={close}
		on:icQRCodeScan={() =>
			goToWizardSendStep({
				modal,
				steps,
				stepName: WizardStepsSend.QR_CODE_SCAN
			})}
		on:icQRCodeBack={() =>
			goToWizardSendStep({
				modal,
				steps,
				stepName: WizardStepsSend.SEND
			})}
	/>
</WizardModal>
