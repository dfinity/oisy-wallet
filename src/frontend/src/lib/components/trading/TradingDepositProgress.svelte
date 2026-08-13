<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		depositProgressStep: string;
	}

	let { depositProgressStep }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsTradingDeposit.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsTradingDeposit.APPROVE,
			text: $i18n.trading.deposit.approving,
			state: 'next'
		},
		{
			step: ProgressStepsTradingDeposit.DEPOSIT,
			text: $i18n.trading.deposit.depositing,
			state: 'next'
		},
		{
			step: ProgressStepsTradingDeposit.UPDATE_UI,
			text: $i18n.send.text.refreshing_ui,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={depositProgressStep} {steps} />
