<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsConvert } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		convertProgressStep?: string;
	}

	let { convertProgressStep = ProgressStepsConvert.INITIALIZATION }: Props = $props();

	let steps: ProgressSteps = $derived([
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
	]);
</script>

<InProgressWizard progressStep={convertProgressStep} {steps} />
