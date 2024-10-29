<script lang="ts">
	import { ProgressSteps, type ProgressStep } from '@dfinity/gix-components';
	import type { ComponentType } from 'svelte';
	import StaticSteps from '$lib/components/ui/StaticSteps.svelte';
	import type { StaticStep } from '$lib/types/steps';

	export let progressStep: string;
	export let steps: [ProgressStep | StaticStep, ...(ProgressStep | StaticStep)[]];
	export let type: 'progress' | 'static' = 'progress';

	let cmp: ComponentType;
	$: cmp = type === 'static' ? StaticSteps : ProgressSteps;

	let dynamicSteps: [ProgressStep | StaticStep, ...(ProgressStep | StaticStep)[]] = [...steps];

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

<div class="px-2 pb-3">
	<svelte:component this={cmp} steps={dynamicSteps} />
</div>
