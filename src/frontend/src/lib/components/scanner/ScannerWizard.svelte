<script lang="ts">
	import ScannerCode from './ScannerCode.svelte';
	import OpenCryptoPay from './OpenCryptoPay.svelte';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { WizardStepsScanner } from '$lib/enums/wizard-steps';
	import { scannerWizardSteps } from '$lib/config/scanner.config';
	import { i18n } from '$lib/stores/i18n.store';
	import { setContext } from 'svelte';
	import {
		initPayContext,
		PAY_CONTEXT_KEY,
		type PayContext
	} from '$lib/stores/open-crypto-pay.store';
	import { modalStore } from '$lib/stores/modal.store';

	let steps = $derived<WizardSteps<WizardStepsScanner>>(scannerWizardSteps({ i18n: $i18n }));

	let currentStep = $state<WizardStep<WizardStepsScanner> | undefined>();

	let modal: WizardModal<WizardStepsScanner> | undefined = $state();

	const onClose = () => modalStore.close();

	setContext<PayContext>(PAY_CONTEXT_KEY, initPayContext());
</script>

<WizardModal {onClose} {steps} bind:this={modal} bind:currentStep>
	{#snippet title()}
		{currentStep?.title}
	{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsScanner.SCAN}
			<ScannerCode onNext={() => modal?.next()} />
		{/if}

		{#if currentStep?.name === WizardStepsScanner.PAY}
			<OpenCryptoPay />
		{/if}
	{/key}
</WizardModal>
