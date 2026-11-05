<script lang="ts">
	import SwapModalWizardSteps from '$lib/components/swap/SwapModalWizardSteps.svelte';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import type { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapSelectTokenType } from '$lib/types/swap';
	import type { WizardModal, WizardStep, WizardSteps } from '$lib/types/wizard';

	// Holds the wizard's bound state, so a test can move between steps without `rerender` resetting
	// which side's list is open.
	interface Props {
		currentStep: WizardStep<WizardStepsSwap>;
		steps: WizardSteps<WizardStepsSwap>;
		modal: WizardModal<WizardStepsSwap>;
	}

	let { currentStep, steps, modal }: Props = $props();

	// No amount: the form would validate it 300 ms after it mounts, by when these tests have moved on
	// to a token list and the form is gone.
	let swapAmount = $state<OptionAmount>();
	let receiveAmount = $state<number | undefined>(2);
	let slippageValue = $state<OptionAmount>();
	let swapProgressStep = $state(ProgressStepsSwap.INITIALIZATION);
	let selectTokenType = $state<SwapSelectTokenType | undefined>();
</script>

<SwapModalWizardSteps
	{currentStep}
	{modal}
	onClose={() => {}}
	{steps}
	bind:swapAmount
	bind:receiveAmount
	bind:slippageValue
	bind:swapProgressStep
	bind:selectTokenType
/>
