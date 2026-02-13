<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsClaimStakingReward } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		claimStakingRewardProgressStep: string;
	}

	let { claimStakingRewardProgressStep }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsClaimStakingReward.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsClaimStakingReward.CLAIM,
			text: $i18n.stake.text.claiming,
			state: 'next'
		},
		{
			step: ProgressStepsClaimStakingReward.UPDATE_UI,
			text: $i18n.send.text.refreshing_ui,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={claimStakingRewardProgressStep} {steps} />
