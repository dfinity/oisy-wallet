<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import SwapEthWizard from '$eth/components/swap/SwapEthWizard.svelte';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';

	// Rebuilds the wizard on every step change, as `SwapModalWizardSteps` does: the review a failed
	// execution returns to is another instance than the one that confirmed.
	type Props = Omit<ComponentProps<typeof SwapEthWizard>, 'currentStep' | 'onNext' | 'onBack'>;

	let props: Props = $props();

	let step = $state(WizardStepsSwap.REVIEW);
</script>

{#key step}
	<SwapEthWizard
		{...props}
		currentStep={{ name: step, title: 'Swap' }}
		onBack={() => (step = WizardStepsSwap.REVIEW)}
		onNext={() => (step = WizardStepsSwap.SWAPPING)}
	/>
{/key}
