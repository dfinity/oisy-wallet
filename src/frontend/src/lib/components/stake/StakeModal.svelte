<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import StakeWizard from '$lib/components/stake/StakeWizard.svelte';
	import { stakeWizardSteps } from '$lib/config/stake.config';
	import { ProgressStepsStake } from '$lib/enums/progress-steps';
	import { WizardStepsStake } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
	}

	let { token }: Props = $props();

	let modal: WizardModal<WizardStepsStake> | undefined = $state();
	let currentStep: WizardStep<WizardStepsStake> | undefined = $state();
	let stakeProgressStep: string = $state(ProgressStepsStake.INITIALIZATION);
	let amount: OptionAmount = $state();

	const steps: WizardSteps<WizardStepsStake> = $derived(
		stakeWizardSteps({
			i18n: $i18n,
			tokenSymbol: getTokenDisplaySymbol(token)
		})
	);

	const reset = () => {
		amount = undefined;

		stakeProgressStep = ProgressStepsStake.INITIALIZATION;

		currentStep = undefined;
	};

	const close = () =>
		closeModal(() => {
			reset();
		});
</script>

<SendTokenContext {token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsStake.STAKING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		<StakeWizard
			{currentStep}
			onBack={modal.back}
			onClose={close}
			onNext={modal.next}
			bind:amount
			bind:stakeProgressStep
		/>
	</WizardModal>
</SendTokenContext>
