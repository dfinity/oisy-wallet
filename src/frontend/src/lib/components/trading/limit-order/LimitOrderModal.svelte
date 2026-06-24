<script lang="ts">
	import { WizardModal } from '@dfinity/gix-components';
	import LimitOrderWizard from '$lib/components/trading/limit-order/LimitOrderWizard.svelte';
	import { limitOrderWizardSteps } from '$lib/config/limit-order.config';
	import { ProgressStepsLimitOrder } from '$lib/enums/progress-steps';
	import { WizardStepsLimitOrder } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { closeModal } from '$lib/utils/modal.utils';

	let modal: WizardModal<WizardStepsLimitOrder> | undefined = $state();
	let currentStep: WizardStep<WizardStepsLimitOrder> | undefined = $state();
	let progressStep: string = $state(ProgressStepsLimitOrder.INITIALIZATION);

	const steps: WizardSteps<WizardStepsLimitOrder> = $derived(
		limitOrderWizardSteps({ i18n: $i18n })
	);

	const reset = () => {
		progressStep = ProgressStepsLimitOrder.INITIALIZATION;
		currentStep = undefined;
	};

	const close = () => closeModal(reset);
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsLimitOrder.PLACING}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if modal}
		<LimitOrderWizard
			{currentStep}
			onBack={modal.back}
			onClose={close}
			onNext={modal.next}
			{steps}
			bind:progressStep
			bind:modal
		/>
	{/if}
</WizardModal>
