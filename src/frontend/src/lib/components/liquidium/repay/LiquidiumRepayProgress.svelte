<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		repayProgressStep: string;
	}

	let { repayProgressStep }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsLiquidiumRepay.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsLiquidiumRepay.TRANSFER,
			text: $i18n.liquidium.text.starting_to_repay,
			state: 'next'
		},
		{
			step: ProgressStepsLiquidiumRepay.REGISTER,
			text: $i18n.liquidium.text.repay_started,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={repayProgressStep} {steps} />
