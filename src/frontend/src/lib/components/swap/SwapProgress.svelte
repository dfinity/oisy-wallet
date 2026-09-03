<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		swapProgressStep?: string;
		sendWithApproval?: boolean;
		// The approve row without the two signing rows `sendWithApproval` also brings,
		// for a flow that approves a ledger allowance and signs nothing the user sees —
		// OISY Trade, whose deposit leg is `icrc2_approve` then `deposit`. On the ICP
		// wizard an approve is a plain canister call, so there is no signature to show;
		// and a step driven into a list that does not render it matches nothing, which
		// leaves every row unhighlighted until the next step that does exist.
		sendWithApprovalOnly?: boolean;
		sendWithTransfer?: boolean;
		swapWithWithdrawing?: boolean;
		swapWithActiveTransaction?: boolean;
		// Only meaningful together with `swapWithActiveTransaction`: whether the
		// background phase is a bridge (1Sec) rather than a plain swap settlement.
		swapWithBridging?: boolean;
		failedSteps?: string[];
	}

	let {
		swapProgressStep = ProgressStepsSwap.INITIALIZATION,
		failedSteps = $bindable([]),
		sendWithApproval = false,
		sendWithApprovalOnly = false,
		sendWithTransfer = false,
		swapWithWithdrawing = false,
		swapWithActiveTransaction = false,
		swapWithBridging = false
	}: Props = $props();

	let steps = $derived<ProgressSteps>([
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
					}
				] as ProgressSteps)
			: []),
		...(sendWithApproval || sendWithTransfer
			? ([
					{
						step: ProgressStepsSwap.SIGN_TRANSFER,
						text: $i18n.send.text.signing_transaction,
						state: 'next'
					}
				] as ProgressSteps)
			: []),
		// Guarded against `sendWithApproval`, which already contributes an `APPROVE`
		// row: two rows sharing one step id would break the in-progress lookup, which
		// matches steps by id. The two props serve different wizards, so this is an
		// invariant rather than a case that arises.
		...(sendWithApprovalOnly && !sendWithApproval
			? ([
					{
						step: ProgressStepsSwap.APPROVE,
						text: $i18n.send.text.approving,
						state: 'next'
					}
				] as ProgressSteps)
			: []),
		{
			step: ProgressStepsSwap.SWAP,
			text: swapWithActiveTransaction ? $i18n.swap.text.starting_to_swap : $i18n.swap.text.swapping,
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
			text: swapWithActiveTransaction
				? swapWithBridging
					? $i18n.swap.text.starting_to_bridge
					: $i18n.swap.text.finishing_in_background
				: $i18n.swap.text.refreshing_ui,
			state: 'next'
		}
	]);
</script>

<InProgressWizard {failedSteps} progressStep={swapProgressStep} {steps} />
