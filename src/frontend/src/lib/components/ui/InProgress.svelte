<script lang="ts">
	import { ProgressSteps, type ProgressStep } from '@dfinity/gix-components';

	export let progressStep: string;
	export let steps: [ProgressStep, ...ProgressStep[]];

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
	<ProgressSteps steps={dynamicSteps} />
</div>
