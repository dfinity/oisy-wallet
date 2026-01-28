<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { assertNever, isNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import OpenCryptoPayWizard from '$lib/components/open-crypto-pay/OpenCryptoPayWizard.svelte';
	import ScannerCode from '$lib/components/scanner/ScannerCode.svelte';
	import { scannerWizardSteps } from '$lib/config/scanner.config';
	import { WizardStepsScanner } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		initPayContext,
		PAY_CONTEXT_KEY,
		type PayContext
	} from '$lib/stores/open-crypto-pay.store';
	import { ScannerResults } from '$lib/types/scanner';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let steps = $derived<WizardSteps<WizardStepsScanner>>(scannerWizardSteps({ i18n: $i18n }));

	let currentStep = $state<WizardStep<WizardStepsScanner> | undefined>();

	let modal: WizardModal<WizardStepsScanner> | undefined = $state();

	const onClose = () => modalStore.close();

	setContext<PayContext>(PAY_CONTEXT_KEY, initPayContext());

	const goToStep = (stepName: WizardStepsScanner) => {
		if (isNullish(modal)) {
			return;
		}

		goToWizardStep({
			modal,
			steps,
			stepName
		});
	};

	const onNext = (results: ScannerResults) => {
		if (results === ScannerResults.PAY) {
			goToStep(WizardStepsScanner.PAY);

			return;
		}

		assertNever(results, `Unhandled scanner result: ${results}`);
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsScanner.TOKENS_LIST}
	{onClose}
	{steps}
	bind:currentStep
>
	{#snippet title()}
		{currentStep?.title}
	{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsScanner.SCAN}
			<ScannerCode {onNext} />
		{:else if currentStep?.name === WizardStepsScanner.PAY || currentStep?.name === WizardStepsScanner.TOKENS_LIST || currentStep?.name === WizardStepsScanner.PAYING || currentStep?.name === WizardStepsScanner.PAYMENT_FAILED || currentStep?.name === WizardStepsScanner.PAYMENT_CONFIRMED}
			<OpenCryptoPayWizard {currentStep} {modal} {steps} />
		{/if}
	{/key}
</WizardModal>
