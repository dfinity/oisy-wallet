<script lang="ts">
	import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import type { ProgressStep } from '@dfinity/gix-components';

	export let receiveProgressStep: string = UpdateBalanceCkBtcStep.INITIALIZATION;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: UpdateBalanceCkBtcStep.INITIALIZATION,
			text: 'Initializing...',
			state: 'in_progress'
		} as ProgressStep,
		{
			step: UpdateBalanceCkBtcStep.RETRIEVE,
			text: 'Checking for incoming BTC...',
			state: 'next'
		} as ProgressStep,
		{
			step: UpdateBalanceCkBtcStep.RELOAD,
			text: 'Refreshing UI...',
			state: 'next'
		} as ProgressStep
	];
</script>

<InProgressWizard progressStep={receiveProgressStep} {steps} />
