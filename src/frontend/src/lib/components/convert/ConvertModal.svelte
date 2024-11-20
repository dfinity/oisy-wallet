<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { createEventDispatcher, getContext } from 'svelte';
	import ConvertWizard from '$lib/components/convert/ConvertWizard.svelte';
	import { convertWizardSteps } from '$lib/config/convert.config';
	import { ProgressStepsConvert } from '$lib/enums/progress-steps';
	import { WizardStepsConvert } from '$lib/enums/wizard-steps.js';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { closeModal } from '$lib/utils/modal.utils';

	const { sourceToken, destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let sendAmount: OptionAmount = undefined;
	let receiveAmount: number | undefined = undefined;
	let convertProgressStep: string = ProgressStepsConvert.INITIALIZATION;
	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	let steps: WizardSteps;
	$: steps = convertWizardSteps({
		i18n: $i18n,
		sourceToken: $sourceToken.symbol,
		destinationToken: $destinationToken.symbol
	});

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			sendAmount = undefined;
			receiveAmount = undefined;

			convertProgressStep = ProgressStepsConvert.INITIALIZATION;

			currentStep = undefined;

			dispatch('nnsClose');
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
		formCancelAction="close"
		on:icBack={modal.back}
		on:icNext={modal.next}
		on:icClose={close}
	/>
</WizardModal>
