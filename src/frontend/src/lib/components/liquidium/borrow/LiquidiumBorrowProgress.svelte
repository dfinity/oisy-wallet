<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsLiquidiumBorrow } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		borrowProgressStep: string;
	}

	let { borrowProgressStep }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsLiquidiumBorrow.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsLiquidiumBorrow.SUBMIT,
			text: $i18n.liquidium.text.starting_to_borrow,
			state: 'next'
		},
		{
			step: ProgressStepsLiquidiumBorrow.REGISTER,
			text: $i18n.liquidium.text.borrow_started,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={borrowProgressStep} {steps} />
