<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { setContext } from 'svelte';
	import OpenCryptoPay from '$lib/components/scanner/OpenCryptoPay.svelte';
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
	import { isNullish } from '@dfinity/utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';
	import TokensList from '$lib/components/scanner/open-crypto-pay/OpenCryptoPayTokensList.svelte';
	import BottomSheetTokensList from '$lib/components/scanner/open-crypto-pay/BottomSheetTokensList.svelte';

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

	let isTokenSelecting = $state<boolean>(false);
</script>

<WizardModal
	bind:this={modal}
	{onClose}
	{steps}
	bind:currentStep
	disablePointerEvents={currentStep?.name === WizardStepsScanner.TOKENS_LIST}
>
	{#snippet title()}
		{currentStep?.title}
	{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsScanner.SCAN}
			<ScannerCode onNext={() => modal?.next()} />
		{:else if currentStep?.name === WizardStepsScanner.PAY}
			<OpenCryptoPay
				onSelectToken={() => goToStep(WizardStepsScanner.TOKENS_LIST)}
				bind:isTokenSelecting
			/>
		{:else if currentStep?.name === WizardStepsScanner.TOKENS_LIST && !isTokenSelecting}
			<TokensList onClose={() => goToStep(WizardStepsScanner.PAY)} />
		{/if}
	{/key}

	{#if isTokenSelecting}
		<BottomSheetTokensList
			onClose={() => {
				goToStep(WizardStepsScanner.PAY);
			}}
			bind:visible={isTokenSelecting}
		/>
	{/if}
</WizardModal>
