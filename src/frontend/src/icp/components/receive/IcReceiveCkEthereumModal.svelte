<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import EthConvertTokenWizard from '$eth/components/convert/EthConvertTokenWizard.svelte';
	import { receiveWizardSteps } from '$eth/config/receive.config';
	import HowToConvertEthereumWizardSteps from '$icp/components/convert/HowToConvertEthereumWizardSteps.svelte';
	import IcReceiveInfoCkEthereum from '$icp/components/receive/IcReceiveInfoCkEthereum.svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import ReceiveAddressQRCode from '$lib/components/receive/ReceiveAddressQRCode.svelte';
	import { ProgressStepsConvert, ProgressStepsSend } from '$lib/enums/progress-steps';
	import {
		WizardStepsConvert,
		WizardStepsHowToConvert,
		WizardStepsReceive
	} from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	export let sourceToken: Token;
	export let destinationToken: Token;

	/**
	 * Props
	 */

	let sendAmount: OptionAmount = undefined;
	let receiveAmount: number | undefined = undefined;
	let convertProgressStep: string = ProgressStepsConvert.INITIALIZATION;

	/**
	 * Wizard modal
	 */

	let steps: WizardSteps;
	$: steps = receiveWizardSteps({
		i18n: $i18n,
		sourceToken: sourceToken.symbol,
		destinationToken: destinationToken.symbol
	});

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			sendAmount = undefined;
			receiveAmount = undefined;

			convertProgressStep = ProgressStepsSend.INITIALIZATION;

			currentStep = undefined;

			dispatch('nnsClose');
		});

	const goToStep = (stepName: WizardStepsHowToConvert | WizardStepsConvert | WizardStepsReceive) =>
		goToWizardStep({
			modal,
			steps,
			stepName
		});
</script>

<ConvertContexts {sourceToken} {destinationToken}>
	<WizardModal
		{steps}
		bind:currentStep
		bind:this={modal}
		on:nnsClose={close}
		disablePointerEvents={currentStep?.name === WizardStepsConvert.CONVERTING}
	>
		<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

		<EthConvertTokenWizard
			{currentStep}
			formCancelAction="back"
			bind:sendAmount
			bind:receiveAmount
			bind:convertProgressStep
			on:icBack={() =>
				currentStep?.name === WizardStepsConvert.CONVERT
					? goToStep(WizardStepsHowToConvert.INFO)
					: modal.back()}
			on:icNext={modal.next}
			on:icClose={close}
		>
			{#if currentStep?.name === WizardStepsHowToConvert.INFO || currentStep?.name === WizardStepsHowToConvert.ETH_QR_CODE}
				<HowToConvertEthereumWizardSteps
					{currentStep}
					formCancelAction="back"
					on:icBack={() =>
						goToStep(
							currentStep?.name === WizardStepsHowToConvert.ETH_QR_CODE
								? WizardStepsHowToConvert.INFO
								: WizardStepsReceive.RECEIVE
						)}
					on:icQRCode={() => goToStep(WizardStepsHowToConvert.ETH_QR_CODE)}
					on:icConvert={() => goToStep(WizardStepsConvert.CONVERT)}
				/>
			{:else if currentStep?.name === WizardStepsReceive.QR_CODE}
				<ReceiveAddressQRCode
					on:icBack={modal.back}
					address={$icrcAccountIdentifierText ?? ''}
					addressToken={ICP_TOKEN}
					network={ICP_NETWORK}
					qrCodeAction={{ enabled: false }}
					copyAriaLabel={$i18n.receive.icp.text.internet_computer_principal_copied}
				/>
			{:else}
				<IcReceiveInfoCkEthereum
					on:icQRCode={() => goToStep(WizardStepsReceive.QR_CODE)}
					on:icHowToConvert={() => goToStep(WizardStepsHowToConvert.INFO)}
				/>
			{/if}
		</EthConvertTokenWizard>
	</WizardModal>
</ConvertContexts>
