<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import OpenCryptoPay from '$lib/components/scanner/OpenCryptoPay.svelte';
	import ScannerCode from '$lib/components/scanner/ScannerCode.svelte';
	import OpenCryptoPayProgress from '$lib/components/scanner/open-crypto-pay/OpenCryptoPayProgress.svelte';
	import TokensList from '$lib/components/scanner/open-crypto-pay/OpenCryptoPayTokensList.svelte';
	import { scannerWizardSteps } from '$lib/config/scanner.config';
	import { ProgressStepsPayment } from '$lib/enums/progress-steps';
	import { WizardStepsScanner } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		initPayContext,
		PAY_CONTEXT_KEY,
		type PayContext
	} from '$lib/stores/open-crypto-pay.store';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let steps = $derived<WizardSteps<WizardStepsScanner>>(scannerWizardSteps({ i18n: $i18n }));

	let currentStep = $state<WizardStep<WizardStepsScanner> | undefined>();

	let modal: WizardModal<WizardStepsScanner> | undefined = $state();

	let payProgressStep = $state(ProgressStepsPayment.REQUEST_DETAILS);

	const onClose = () => modalStore.close();

	let { resetStore } = setContext<PayContext>(PAY_CONTEXT_KEY, initPayContext());

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
		{:else if currentStep?.name === WizardStepsScanner.PAY}
			<OpenCryptoPay
				onPay={() => goToStep(WizardStepsScanner.PAYING)}
				onSelectToken={() => goToStep(WizardStepsScanner.TOKENS_LIST)}
				onSuccessPay={() => goToStep(WizardStepsScanner.PAYMENT_CONFIRMED)}
				onFailedPay={() => goToStep(WizardStepsScanner.PAYMENT_FAILED)}
				bind:isTokenSelecting
				bind:payProgressStep
			/>
		{:else if currentStep?.name === WizardStepsScanner.TOKENS_LIST && !isTokenSelecting}
			<TokensList onClose={() => goToStep(WizardStepsScanner.PAY)} />
		{:else if currentStep?.name === WizardStepsScanner.PAYING}
			<OpenCryptoPayProgress {payProgressStep} />
		{:else if currentStep?.name === WizardStepsScanner.PAYMENT_CONFIRMED}
			<PaymentFailed
				onClose={() => {
					resetStore();
					goToStep(WizardStepsScanner.SCAN);
				}}
			/>
		{:else if currentStep?.name === WizardStepsScanner.PAYMENT_FAILED}
			<PaymentSucceeded {onClose} />
		{/if}
	{/key}
</WizardModal>
