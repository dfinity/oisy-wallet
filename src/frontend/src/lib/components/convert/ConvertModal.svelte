<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { createEventDispatcher, setContext } from 'svelte';
	import ConvertWizard from '$lib/components/convert/ConvertWizard.svelte';
	import { convertWizardSteps } from '$lib/config/convert.config';
	import { ProgressStepsConvert } from '$lib/enums/progress-steps';
	import { WizardStepsConvert } from '$lib/enums/wizard-steps';
	import {
		CONVERT_CONTEXT_KEY,
		type ConvertContext,
		initConvertContext
	} from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initTokenActionValidationErrorsContext,
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		type TokenActionValidationErrorsContext
	} from '$lib/stores/token-action-validation-errors.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardSendStep } from '$lib/utils/wizard-modal.utils';

	export let sourceToken: Token;
	export let destinationToken: Token;

	setContext<ConvertContext>(
		CONVERT_CONTEXT_KEY,
		initConvertContext({
			sourceToken,
			destinationToken
		})
	);

	setContext<TokenActionValidationErrorsContext>(
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		initTokenActionValidationErrorsContext()
	);

	let sendAmount: OptionAmount = undefined;
	let receiveAmount: number | undefined = undefined;
	let customDestination = '';
	let convertProgressStep: string = ProgressStepsConvert.INITIALIZATION;
	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let steps: WizardSteps;
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
		goToWizardSendStep({
			modal,
			steps,
			stepName: stepName
		});
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === WizardStepsConvert.CONVERTING}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	<ConvertWizard
		{currentStep}
		bind:sendAmount
		bind:receiveAmount
		bind:convertProgressStep
		bind:customDestination
		formCancelAction="close"
		on:icBack={modal.back}
		on:icNext={modal.next}
		on:icDestination={() => goToStep(WizardStepsConvert.DESTINATION)}
		on:icDestinationBack={() => goToStep(WizardStepsConvert.CONVERT)}
		on:icQRCodeScan={() => goToStep(WizardStepsConvert.QR_CODE_SCAN)}
		on:icQRCodeBack={() => goToStep(WizardStepsConvert.DESTINATION)}
		on:icClose={close}
	/>
</WizardModal>
