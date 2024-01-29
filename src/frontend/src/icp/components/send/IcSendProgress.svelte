<script lang="ts">
	import { SendIcStep } from '$lib/enums/steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import type { ProgressStep } from '@dfinity/gix-components';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBTC, isNetworkIdETH } from '$icp/utils/ic-send.utils';

	export let sendProgressStep: string = SendIcStep.INITIALIZATION;
	export let networkId: NetworkId | undefined = undefined;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: SendIcStep.INITIALIZATION,
			text: 'Initializing transaction...',
			state: 'in_progress'
		} as ProgressStep,
		...(isNetworkIdBTC(networkId) || isNetworkIdETH(networkId)
			? [
					{
						step: SendIcStep.APPROVE,
						text: 'Approving...',
						state: 'next'
					} as ProgressStep
				]
			: []),
		{
			step: SendIcStep.SEND,
			text: 'Sending...',
			state: 'next'
		} as ProgressStep,
		{
			step: SendIcStep.RELOAD,
			text: 'Refreshing UI...',
			state: 'next'
		} as ProgressStep
	];
</script>

<InProgressWizard progressStep={sendProgressStep} {steps} />
