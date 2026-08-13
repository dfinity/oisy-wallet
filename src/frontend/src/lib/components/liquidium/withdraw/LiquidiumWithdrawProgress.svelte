<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsLiquidiumWithdraw } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		withdrawProgressStep: string;
	}

	let { withdrawProgressStep }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsLiquidiumWithdraw.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsLiquidiumWithdraw.SUBMIT,
			text: $i18n.liquidium.text.starting_to_withdraw,
			state: 'next'
		},
		{
			step: ProgressStepsLiquidiumWithdraw.REGISTER,
			text: $i18n.liquidium.text.withdraw_started,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={withdrawProgressStep} {steps} />
