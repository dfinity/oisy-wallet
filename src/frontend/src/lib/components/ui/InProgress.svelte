<script lang="ts">
	import { ProgressSteps as ProgressStepsCmp, type ProgressStep } from '@dfinity/gix-components';
	import { untrack } from 'svelte';
	import StaticSteps from '$lib/components/ui/StaticSteps.svelte';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import type { StaticStep } from '$lib/types/steps';
	import type { NonEmptyArray } from '$lib/types/utils';

	interface Props {
		progressStep: string;
		steps: NonEmptyArray<ProgressStep | StaticStep>;
		type?: 'progress' | 'static';
		failedSteps?: string[];
	}

	let { progressStep, steps, type = 'progress', failedSteps = [] }: Props = $props();

	let Cmp = $derived(type === 'static' ? StaticSteps : ProgressStepsCmp);

	let dynamicSteps = $state<ProgressSteps>([
		// TODO: have a look if there is a better solution than casting
		...(steps as ProgressSteps)
	]);

	const updateSteps = () => {
		const progressIndex = dynamicSteps.findIndex(({ step }) => step === progressStep);

		dynamicSteps = dynamicSteps.map((step, index) => {
			if (failedSteps.includes(step.step)) {
				return { ...step, state: 'failed' };
			}

			if (step.step === progressStep) {
				return { ...step, state: 'in_progress' };
			}
			return {
				...step,
				state: index < progressIndex || progressStep === 'done' ? 'completed' : 'next'
			};
		}) as ProgressSteps;
	};

	$effect(() => {
		[progressStep];

		untrack(() => updateSteps());
	});
</script>

<div class="px-2 pb-3">
	<Cmp steps={dynamicSteps} />
</div>
