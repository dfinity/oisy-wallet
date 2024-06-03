<script lang="ts">
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import type { ProgressStep } from '@dfinity/gix-components';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdETH } from '$icp/utils/ic-send.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenCkErc20Ledger } from '$icp/derived/ic-token.derived';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';

	export let sendProgressStep: string = ProgressStepsSendIc.INITIALIZATION;
	export let networkId: NetworkId | undefined = undefined;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: ProgressStepsSendIc.INITIALIZATION,
			text: $i18n.send.text.initializing_transaction,
			state: 'in_progress'
		} as ProgressStep,
		...($tokenCkErc20Ledger
			? [
					{
						step: ProgressStepsSendIc.APPROVE_FEES,
						text: $i18n.send.text.approving_fees,
						state: 'next'
					} as ProgressStep
				]
			: []),
		...(isNetworkIdBitcoin(networkId) || isNetworkIdETH(networkId)
			? [
					{
						step: ProgressStepsSendIc.APPROVE_TRANSFER,
						text: $tokenCkErc20Ledger
							? $i18n.send.text.approving_transfer
							: $i18n.send.text.approving,
						state: 'next'
					} as ProgressStep
				]
			: []),
		{
			step: ProgressStepsSendIc.SEND,
			text: $i18n.send.text.sending,
			state: 'next'
		} as ProgressStep,
		{
			step: ProgressStepsSendIc.RELOAD,
			text: $i18n.send.text.refreshing_ui,
			state: 'next'
		} as ProgressStep
	];
</script>

<InProgressWizard progressStep={sendProgressStep} {steps} />
