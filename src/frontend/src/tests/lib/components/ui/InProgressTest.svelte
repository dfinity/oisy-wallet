<script lang="ts">
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		steps: ProgressSteps;
		progressStep: string;
	}

	let { steps, progressStep }: Props = $props();

	// Held apart from `progressStep`, the way a wizard holds them, so marking a step as failed
	// changes nothing else.
	let failedSteps = $state<string[]>([]);
</script>

<InProgress {failedSteps} {progressStep} {steps} />

<button onclick={() => (failedSteps = [progressStep])} type="button">fail</button>
