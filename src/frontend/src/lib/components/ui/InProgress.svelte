<script lang="ts">
	import { ProgressSteps, type ProgressStep } from '@dfinity/gix-components';
	import type { SvelteComponent } from 'svelte';
	import StaticSteps from '$lib/components/ui/StaticSteps.svelte';

	export let progressStep: string;
	export let steps: [ProgressStep, ...ProgressStep[]];
	export let type: 'progress' | 'static' = 'progress';

	let cmp: typeof SvelteComponent;
	$: cmp = type === 'static' ? StaticSteps : ProgressSteps;

	let dynamicSteps: [ProgressStep, ...ProgressStep[]] = [...steps];

	const updateSteps = () => {
		const progressIndex = dynamicSteps.findIndex(({ step }) => step === progressStep);

		dynamicSteps = dynamicSteps.map((step, index) =>
			step.step === progressStep
				? {
						...step,
						state: 'in_progress'
				  }
				: {
						...step,
						state: index < progressIndex || progressStep === 'done' ? 'completed' : 'next'
				  }
		) as [ProgressStep, ...ProgressStep[]];
	};

	$: progressStep, updateSteps();
</script>

<div class="px-1">
	<svelte:component this={cmp} steps={dynamicSteps} />
</div>
