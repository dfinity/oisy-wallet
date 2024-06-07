<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import SendTokenWizard from '$eth/components/send/SendTokenWizard.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { sendWizardStepsWithQrCodeScan } from '$eth/config/send.config';
	import { closeModal } from '$lib/utils/modal.utils';
	import type { Network } from '$lib/types/network';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { Erc20Token } from '$eth/types/erc20';
	import { ethereumToken } from '$eth/derived/token.derived';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { goToWizardSendStep } from '$lib/utils/wizard-modal.utils';

	/**
	 * Props
	 */

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;

	let amount: number | undefined = undefined;
	let sendProgressStep: string = ProgressStepsSend.INITIALIZATION;

	/**
	 * Send context store
	 */

	const { sendPurpose, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Wizard modal
	 */

	let firstStep: WizardStep;
	let otherSteps: WizardStep[];
	$: [firstStep, ...otherSteps] = sendWizardStepsWithQrCodeScan($i18n);

	let steps: WizardSteps;
	$: steps = [
		{
			...firstStep,
			title:
				sendPurpose === 'convert-eth-to-cketh'
					? $i18n.convert.text.convert_to_cketh
					: sendPurpose === 'convert-erc20-to-ckerc20'
						? replacePlaceholders($i18n.convert.text.convert_to_ckerc20, {
								$ckErc20: ($sendToken as Erc20Token).twinTokenSymbol ?? 'ckETH'
							})
						: $i18n.send.text.send
		},
		...otherSteps
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			targetNetwork = undefined;

			sendProgressStep = ProgressStepsSend.INITIALIZATION;

			currentStep = undefined;
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

	<SendTokenWizard
		{currentStep}
		sourceNetwork={$selectedEthereumNetwork}
		nativeEthereumToken={$ethereumToken}
		bind:destination
		bind:targetNetwork
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
