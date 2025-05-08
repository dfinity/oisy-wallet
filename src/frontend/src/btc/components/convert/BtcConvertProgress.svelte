<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsConvert } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	export let convertProgressStep: string = ProgressStepsConvert.INITIALIZATION;

	let steps: ProgressSteps;
	$: steps = [
		{
			step: ProgressStepsConvert.INITIALIZATION,
			text: $i18n.convert.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsConvert.CONVERT,
			text: $i18n.convert.text.converting,
			state: 'next'
		},
		{
			step: ProgressStepsConvert.UPDATE_UI,
			text: $i18n.convert.text.refreshing_ui,
			state: 'next'
		}
	];
</script>

<InProgressWizard progressStep={convertProgressStep} {steps} />
