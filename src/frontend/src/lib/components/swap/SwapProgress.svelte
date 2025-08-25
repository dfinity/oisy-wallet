<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		swapProgressStep?: string;
		sendWithApproval?: boolean;
		swapWithWithdrawing?: boolean;
		failedSteps?: string[];
	}

	let {
		swapProgressStep = $bindable(ProgressStepsSwap.INITIALIZATION),
		failedSteps = $bindable([]),
		sendWithApproval = false,
		swapWithWithdrawing = false
	}: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsSwap.INITIALIZATION,
			text: $i18n.swap.text.initializing,
			state: 'in_progress'
		},
		...(sendWithApproval
			? ([
					{
						step: ProgressStepsSwap.SIGN_APPROVE,
						text: $i18n.send.text.signing_approval,
						state: 'next'
					},
					{
						step: ProgressStepsSwap.APPROVE,
						text: $i18n.send.text.approving,
						state: 'next'
					},
					{
						step: ProgressStepsSwap.SIGN_TRANSFER,
						text: $i18n.send.text.signing_transaction,
						state: 'next'
					}
				] as ProgressSteps)
			: []),
		{
			step: ProgressStepsSwap.SWAP,
			text: $i18n.swap.text.swapping,
			state: 'next'
		},
		...(swapWithWithdrawing
			? ([
					{
						step: ProgressStepsSwap.WITHDRAW,
						text: $i18n.swap.text.withdrawing,
						state: 'next'
					}
				] as ProgressSteps)
			: []),
		{
			step: ProgressStepsSwap.UPDATE_UI,
			text: $i18n.swap.text.refreshing_ui,
			state: 'next'
		}
	]);
</script>

<InProgressWizard {failedSteps} progressStep={swapProgressStep} {steps} />
