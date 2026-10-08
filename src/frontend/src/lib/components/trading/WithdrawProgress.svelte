<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		withdrawProgressStep: string;
		symbol: string;
	}

	let { withdrawProgressStep, symbol }: Props = $props();

	let steps = $derived<ProgressSteps>([
		{
			step: ProgressStepsTradingWithdraw.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsTradingWithdraw.WITHDRAW,
			text: replacePlaceholders($i18n.trading.withdraw.progress_withdraw, { $symbol: symbol }),
			state: 'next'
		},
		{
			step: ProgressStepsTradingWithdraw.UPDATE_UI,
			text: $i18n.send.text.refreshing_ui,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={withdrawProgressStep} {steps} />
