<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { setContext } from 'svelte';
	import OpenCryptoPayWizardSteps from '$lib/components/open-crypto-pay/OpenCryptoPayWizardSteps.svelte';
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

	let steps = $derived<WizardSteps<WizardStepsScanner>>(scannerWizardSteps({ i18n: $i18n }));

	let currentStep = $state<WizardStep<WizardStepsScanner> | undefined>();

	let modal: WizardModal<WizardStepsScanner> | undefined = $state();

	const onClose = () => modalStore.close();

	setContext<PayContext>(PAY_CONTEXT_KEY, initPayContext());
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
			<ScannerCode onNext={() => modal?.next()} />
		{:else if currentStep?.name === WizardStepsScanner.PAY || currentStep?.name === WizardStepsScanner.TOKENS_LIST || currentStep?.name === WizardStepsScanner.PAYING || currentStep?.name === WizardStepsScanner.PAYMENT_FAILED || currentStep?.name === WizardStepsScanner.PAYMENT_CONFIRMED}
			<OpenCryptoPayWizardSteps {currentStep} {modal} {steps} />
		{/if}
	{/key}
</WizardModal>
