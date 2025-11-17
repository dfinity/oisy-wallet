<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import ConvertWizard from '$lib/components/convert/ConvertWizard.svelte';
	import { convertWizardSteps, type WizardStepsConvertComplete } from '$lib/config/convert.config';
	import { ProgressStepsConvert } from '$lib/enums/progress-steps';
	import { WizardStepsConvert } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		sourceToken: Token;
		destinationToken: Token;
	}

	let { sourceToken, destinationToken }: Props = $props();

	let sendAmount = $state<OptionAmount>();
	let receiveAmount = $state<number | undefined>();
	let customDestination = $state('');
	let convertProgressStep = $state<ProgressStepsConvert>(ProgressStepsConvert.INITIALIZATION);
	let currentStep = $state<WizardStep<WizardStepsConvertComplete> | undefined>();
	let modal = $state<WizardModal<WizardStepsConvertComplete>>();

	let steps = $derived(
		convertWizardSteps({
			i18n: $i18n,
			sourceToken: sourceToken.symbol,
			destinationToken: destinationToken.symbol
		})
	);

	const close = () =>
		closeModal(() => {
			sendAmount = undefined;
			receiveAmount = undefined;
			customDestination = '';

			convertProgressStep = ProgressStepsConvert.INITIALIZATION;

			currentStep = undefined;
		});

	const goToStep = (stepName: WizardStepsConvert) => {
		if (isNullish(modal)) {
			return;
		}

		goToWizardStep({
			modal,
			steps,
			stepName
		});
	};
</script>

<ConvertContexts {destinationToken} {sourceToken}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsConvert.CONVERTING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		<ConvertWizard
			{currentStep}
			formCancelAction="close"
			onBack={modal.back}
			onClose={close}
			onDestination={() => goToStep(WizardStepsConvert.DESTINATION)}
			onDestinationBack={() => goToStep(WizardStepsConvert.CONVERT)}
			onNext={modal.next}
			onQRCodeBack={() => goToStep(WizardStepsConvert.DESTINATION)}
			onQRCodeScan={() => goToStep(WizardStepsConvert.QR_CODE_SCAN)}
			bind:sendAmount
			bind:receiveAmount
			bind:convertProgressStep
			bind:customDestination
		/>
	</WizardModal>
</ConvertContexts>
