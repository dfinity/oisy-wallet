<script lang="ts">
	import type { WizardModal, WizardStep, WizardSteps } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import OpenCryptoPay from '$lib/components/open-crypto-pay/OpenCryptoPay.svelte';
	import OpenCryptoPayProgress from '$lib/components/open-crypto-pay/OpenCryptoPayProgress.svelte';
	import OpenCryptoPayTokensList from '$lib/components/open-crypto-pay/OpenCryptoPayTokensList.svelte';
	import PaymentFailed from '$lib/components/open-crypto-pay/PaymentFailed.svelte';
	import PaymentSucceeded from '$lib/components/open-crypto-pay/PaymentSucceeded.svelte';
	import ScannerCode from '$lib/components/scanner/ScannerCode.svelte';
	import { ProgressStepsPayment } from '$lib/enums/progress-steps';
	import { WizardStepsScanner } from '$lib/enums/wizard-steps';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		initPayContext,
		PAY_CONTEXT_KEY,
		type PayContext
	} from '$lib/stores/open-crypto-pay.store';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		modal: WizardModal<WizardStepsScanner>;
		steps: WizardSteps<WizardStepsScanner>;
		currentStep?: WizardStep<WizardStepsScanner>;
	}

	let { modal, steps, currentStep }: Props = $props();

	let payProgressStep = $state(ProgressStepsPayment.REQUEST_DETAILS);

	const onClose = () => modalStore.close();

	const { reset } = setContext<PayContext>(PAY_CONTEXT_KEY, initPayContext());

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

	let isTokenSelecting = $state<boolean>(false);
</script>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsScanner.SCAN}
		<ScannerCode onNext={() => modal?.next()} />
	{:else if currentStep?.name === WizardStepsScanner.PAY}
		<OpenCryptoPay
			onPay={() => goToStep(WizardStepsScanner.PAYING)}
			onPayFailed={() => goToStep(WizardStepsScanner.PAYMENT_FAILED)}
			onPaySucceeded={() => goToStep(WizardStepsScanner.PAYMENT_CONFIRMED)}
			onSelectToken={() => goToStep(WizardStepsScanner.TOKENS_LIST)}
			bind:isTokenSelecting
			bind:payProgressStep
		/>
	{:else if currentStep?.name === WizardStepsScanner.TOKENS_LIST && !isTokenSelecting}
		<OpenCryptoPayTokensList onClose={() => goToStep(WizardStepsScanner.PAY)} />
	{:else if currentStep?.name === WizardStepsScanner.PAYING}
		<OpenCryptoPayProgress {payProgressStep} />
	{:else if currentStep?.name === WizardStepsScanner.PAYMENT_FAILED}
		<PaymentFailed
			onClose={() => {
				reset();
				goToStep(WizardStepsScanner.SCAN);
			}}
		/>
	{:else if currentStep?.name === WizardStepsScanner.PAYMENT_CONFIRMED}
		<PaymentSucceeded {onClose} />
	{/if}
{/key}
