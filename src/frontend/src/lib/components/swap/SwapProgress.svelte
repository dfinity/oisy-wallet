<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	export let swapProgressStep: string = ProgressStepsSwap.INITIALIZATION;

	let steps: ProgressSteps;
	$: steps = [
		{
			step: ProgressStepsSwap.INITIALIZATION,
			text: $i18n.swap.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsSwap.SWAP,
			text: $i18n.swap.text.swapping,
			state: 'next'
		},
		{
			step: ProgressStepsSwap.UPDATE_UI,
			text: $i18n.swap.text.refreshing_ui,
			state: 'next'
		}
	];
</script>

<InProgressWizard progressStep={swapProgressStep} {steps} />
