<script lang="ts">
	import { ProgressSteps as ProgressStepsCmp, type ProgressStep } from '@dfinity/gix-components';
	import StaticSteps from '$lib/components/ui/StaticSteps.svelte';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import type { StaticStep } from '$lib/types/steps';
	import type { NonEmptyArray } from '$lib/types/utils';

	export let progressStep: string;
	export let steps: NonEmptyArray<ProgressStep | StaticStep>;
	export let type: 'progress' | 'static' = 'progress';

	let cmp: typeof StaticSteps | typeof ProgressStepsCmp;
	$: cmp = type === 'static' ? StaticSteps : ProgressStepsCmp;

	let dynamicSteps: ProgressSteps = [
		// TODO: have a look if there is a better solution than casting
		...(steps as ProgressSteps)
	];

		const updateSteps = () => {
		console.log('🔍 InProgress - updateSteps called');
		
		// ⭐ ВИКОРИСТОВУЙТЕ steps prop НАПРЯМУ, а не dynamicSteps
		const progressIndex = (steps as ProgressSteps).findIndex(({ step }) => step === progressStep);

		// ⭐ БАЗУЙТЕСЯ НА АКТУАЛЬНИХ steps prop
		return (steps as ProgressSteps).map((step, index) => {
			console.log(`🔍 Step ${step.step} has state: ${step.state}`);
			
			if (step.state === 'failed') {
				console.log('🔍 InProgress - preserving failed step:', step.step);
				return step;
			}

			return step.step === progressStep
				? { ...step, state: 'in_progress' }
				: { ...step, state: index < progressIndex || progressStep === 'done' ? 'completed' : 'next' };
		});
	};

	$: progressStep, updateSteps();
</script>

<div class="px-2 pb-3">
	<svelte:component this={cmp} steps={dynamicSteps} />
</div>
