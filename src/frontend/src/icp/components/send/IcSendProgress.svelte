<script lang="ts">
	import { SendIcStep } from '$lib/enums/steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import type { ProgressStep } from '@dfinity/gix-components';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBTC, isNetworkIdETH } from '$icp/utils/ic-send.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenCkErc20Ledger } from '$icp/derived/ic-token.derived';

	export let sendProgressStep: string = SendIcStep.INITIALIZATION;
	export let networkId: NetworkId | undefined = undefined;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: SendIcStep.INITIALIZATION,
			text: $i18n.send.text.initializing_transaction,
			state: 'in_progress'
		} as ProgressStep,
		...($tokenCkErc20Ledger
			? [
					{
						step: SendIcStep.APPROVE_FEES,
						text: $i18n.send.text.approving_fees,
						state: 'next'
					} as ProgressStep
				]
			: []),
		...(isNetworkIdBTC(networkId) || isNetworkIdETH(networkId)
			? [
					{
						step: SendIcStep.APPROVE_TRANSFER,
						text: $i18n.send.text.approving,
						state: 'next'
					} as ProgressStep
				]
			: []),
		{
			step: SendIcStep.SEND,
			text: $i18n.send.text.sending,
			state: 'next'
		} as ProgressStep,
		{
			step: SendIcStep.RELOAD,
			text: $i18n.send.text.refreshing_ui,
			state: 'next'
		} as ProgressStep
	];
</script>

<InProgressWizard progressStep={sendProgressStep} {steps} />
