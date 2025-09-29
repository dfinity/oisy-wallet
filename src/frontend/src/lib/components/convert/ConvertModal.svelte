<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import ConvertWizard from '$lib/components/convert/ConvertWizard.svelte';
	import { convertWizardSteps, type WizardStepsConvertComplete } from '$lib/config/convert.config';
	import { ProgressStepsConvert } from '$lib/enums/progress-steps';
	import { WizardStepsConvert } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	export let sourceToken: Token;
	export let destinationToken: Token;

	let sendAmount: OptionAmount = undefined;
	let receiveAmount: number | undefined = undefined;
	let customDestination = '';
	let convertProgressStep: string = ProgressStepsConvert.INITIALIZATION;
	let currentStep: WizardStep<WizardStepsConvertComplete> | undefined;
	let modal: WizardModal<WizardStepsConvertComplete>;

	let steps: WizardSteps<WizardStepsConvertComplete>;
	$: steps = convertWizardSteps({
		i18n: $i18n,
		sourceToken: sourceToken.symbol,
		destinationToken: destinationToken.symbol
	});

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			sendAmount = undefined;
			receiveAmount = undefined;
			customDestination = '';

			convertProgressStep = ProgressStepsConvert.INITIALIZATION;

			currentStep = undefined;

			dispatch('nnsClose');
		});

	const goToStep = (stepName: WizardStepsConvert) =>
		goToWizardStep({
			modal,
			steps,
			stepName
		});
</script>

<ConvertContexts {destinationToken} {sourceToken}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsConvert.CONVERTING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		<ConvertWizard
			{currentStep}
			formCancelAction="close"
			onBack={modal.back}
			onClose={close}
			onDestination={() => goToStep(WizardStepsConvert.DESTINATION)}
			onDestinationBack={() => goToStep(WizardStepsConvert.CONVERT)}
			onIcQrCodeBack={() => goToStep(WizardStepsConvert.DESTINATION)}
			onIcQrCodeScan={() => goToStep(WizardStepsConvert.QR_CODE_SCAN)}
			onNext={modal.next}
			bind:sendAmount
			bind:receiveAmount
			bind:convertProgressStep
			bind:customDestination
		/>
	</WizardModal>
</ConvertContexts>
