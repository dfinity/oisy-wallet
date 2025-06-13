<script lang="ts">
	import { ProgressSteps as ProgressStepsCmp, type ProgressStep } from '@dfinity/gix-components';
	import StaticSteps from '$lib/components/ui/StaticSteps.svelte';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import type { StaticStep } from '$lib/types/steps';
	import type { NonEmptyArray } from '$lib/types/utils';

	interface Props {
		progressStep: string;
		steps: NonEmptyArray<ProgressStep | StaticStep>;
		type?: 'progress' | 'static';
	}

	let {progressStep, steps, type = 'progress'}: Props = $props();

	const cmp: typeof StaticSteps | typeof ProgressStepsCmp = $derived(type === 'static' ? StaticSteps : ProgressStepsCmp);

	let dynamicSteps: ProgressSteps = $state([
		// TODO: have a look if there is a better solution than casting
		...(steps as ProgressSteps)
	])

	$effect(() => {
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
		) as ProgressSteps;
	})
</script>

<div class="px-2 pb-3">
	<svelte:component this={cmp} steps={dynamicSteps} />
</div>
