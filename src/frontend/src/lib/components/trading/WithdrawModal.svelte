<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import WithdrawWizard from '$lib/components/trading/WithdrawWizard.svelte';
	import { tradingWithdrawWizardSteps } from '$lib/config/trading-withdraw.config';
	import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
	import { WizardStepsTradingWithdraw } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
	import type { OptionAmount } from '$lib/types/send';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		withdrawToken: OisyTradeWithdrawToken;
	}

	let { withdrawToken }: Props = $props();

	let { token, free, reserved } = $derived(withdrawToken);

	let modal: WizardModal<WizardStepsTradingWithdraw> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTradingWithdraw> | undefined = $state();
	let amount: OptionAmount = $state();
	let amountSetToMax = $state(false);
	let withdrawProgressStep: string = $state(ProgressStepsTradingWithdraw.INITIALIZATION);

	const steps: WizardSteps<WizardStepsTradingWithdraw> = $derived(
		tradingWithdrawWizardSteps({ i18n: $i18n })
	);

	const reset = () => {
		amount = undefined;
		amountSetToMax = false;
		withdrawProgressStep = ProgressStepsTradingWithdraw.INITIALIZATION;
		currentStep = undefined;
	};

	const close = () => closeModal(reset);
</script>

<SendTokenContext customSendBalance={free} {token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsTradingWithdraw.WITHDRAWING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		<WithdrawWizard
			{currentStep}
			onBack={modal.back}
			onClose={close}
			onNext={modal.next}
			{reserved}
			{token}
			bind:amount
			bind:amountSetToMax
			bind:withdrawProgressStep
		/>
	</WizardModal>
</SendTokenContext>
