<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import EthConvertTokenWizard from '$eth/components/convert/EthConvertTokenWizard.svelte';
	import HowToConvertEthereumWizardSteps from '$icp/components/convert/HowToConvertEthereumWizardSteps.svelte';
	import { howToConvertWizardSteps } from '$icp-eth/config/how-to-convert.config';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import { ProgressStepsConvert, ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsHowToConvert, WizardStepsConvert } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	export let sourceToken: Token;
	export let destinationToken: Token;

	let sendAmount: OptionAmount = undefined;
	let receiveAmount: number | undefined = undefined;
	let convertProgressStep: string = ProgressStepsConvert.INITIALIZATION;

	let steps: WizardSteps;
	$: steps = howToConvertWizardSteps({
		i18n: $i18n,
		sourceToken: sourceToken.symbol,
		destinationToken: destinationToken.symbol
	});

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () =>
		closeModal(() => {
			sendAmount = undefined;
			receiveAmount = undefined;

			convertProgressStep = ProgressStepsSend.INITIALIZATION;

			currentStep = undefined;
		});

	const goToStep = (stepName: WizardStepsHowToConvert | WizardStepsConvert) =>
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
			<HowToConvertEthereumWizardSteps
				{currentStep}
				on:icQRCode={() => goToStep(WizardStepsHowToConvert.ETH_QR_CODE)}
				on:icConvert={() => goToStep(WizardStepsConvert.CONVERT)}
				on:icBack={modal.back}
			/>
		</EthConvertTokenWizard>
	</WizardModal>
</ConvertContexts>
