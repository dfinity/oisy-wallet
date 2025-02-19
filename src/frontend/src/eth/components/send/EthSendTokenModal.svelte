<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import { selectedEthereumNetwork } from '$eth/derived/network.derived';
	import { ethereumToken } from '$eth/derived/token.derived';
	import type { Erc20Token } from '$eth/types/erc20';
	import {
		IC_TOKEN_FEE_CONTEXT_KEY,
		type IcTokenFeeContext,
		icTokenFeeStore
	} from '$icp/stores/ic-token-fee.store';
	import { sendWizardStepsWithQrCodeScan } from '$lib/config/send.config';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { closeModal } from '$lib/utils/modal.utils';
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
	 * Ic token fee context store
	 */
	setContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY, {
		store: icTokenFeeStore
	});

	/**
	 * Wizard modal
	 */

	let firstStep: WizardStep;
	let otherSteps: WizardStep[];
	$: [firstStep, ...otherSteps] = sendWizardStepsWithQrCodeScan({
		i18n: $i18n,
		converting: sendPurpose === 'convert-eth-to-cketh' || sendPurpose === 'convert-erc20-to-ckerc20'
	});

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

	<EthSendTokenWizard
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
