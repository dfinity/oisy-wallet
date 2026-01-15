<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsStake } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		stakeProgressStep: string;
	}

	let { stakeProgressStep }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsStake.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsStake.APPROVE,
			text: $i18n.send.text.approving,
			state: 'next'
		},
		{
			step: ProgressStepsStake.STAKE,
			text: $i18n.send.text.sending,
			state: 'next'
		},
		{
			step: ProgressStepsStake.UPDATE_UI,
			text: $i18n.send.text.refreshing_ui,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={stakeProgressStep} {steps} />
