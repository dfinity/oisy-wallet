<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsLimitOrder } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		progressStep: string;
	}

	let { progressStep }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsLimitOrder.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsLimitOrder.PLACE,
			text: $i18n.trading.limit_order.placing_initializing,
			state: 'next'
		},
		{
			step: ProgressStepsLimitOrder.UPDATE_UI,
			text: $i18n.send.text.refreshing_ui,
			state: 'next'
		}
	]);
</script>

<InProgressWizard {progressStep} {steps} />
