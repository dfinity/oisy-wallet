<script lang="ts">
	import {
		Backdrop,
		BottomSheet,
		WizardModal,
		type WizardStep,
		type WizardSteps
	} from '@dfinity/gix-components';
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
	import PayTokenList from './PayTokenList.svelte';
	import ButtonIcon from '../ui/ButtonIcon.svelte';
	import IconClose from '../icons/lucide/IconClose.svelte';
	import ContentWithToolbar from '../ui/ContentWithToolbar.svelte';
	import ButtonBack from '../ui/ButtonBack.svelte';

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
			<ContentWithToolbar styleClass="flex flex-col w-full">
				<PayTokenList onClose={() => goToStep(WizardStepsScanner.PAY)} />
				{#snippet toolbar()}
					<ButtonBack fullWidth onclick={() => goToStep(WizardStepsScanner.PAY)} />
				{/snippet}
			</ContentWithToolbar>
		{/if}
	{/key}
</WizardModal>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsScanner.TOKENS_LIST && isTokenSelecting}
		<div class="fixed inset-0 z-50">
			<BottomSheet transition>
				<div class="flex w-full flex-col p-2">
					<div class="w-full">
						<ButtonIcon
							ariaLabel={$i18n.core.alt.close_details}
							disabled={false}
							onclick={() => goToStep(WizardStepsScanner.PAY)}
							styleClass="text-disabled float-right"
						>
							{#snippet icon()}
								<IconClose size="24" />
							{/snippet}
						</ButtonIcon>
					</div>

					<h3 class=" mb-2 text-center">Select token to pay</h3>

					<PayTokenList onClose={() => goToStep(WizardStepsScanner.PAY)} />
				</div>
			</BottomSheet>

			<Backdrop on:nnsClose={() => goToStep(WizardStepsScanner.PAY)} />
		</div>
	{/if}
{/key}
