<script lang="ts">
	import { SendIcStep, SendStep } from '$lib/enums/steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import type { ProgressStep } from '@dfinity/gix-components';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBtc } from '$icp/utils/send.utils';

	export let sendProgressStep: string = SendIcStep.INITIALIZATION;
	export let networkId: NetworkId | undefined = undefined;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: SendStep.INITIALIZATION,
			text: 'Initializing transaction...',
			state: 'in_progress'
		} as ProgressStep,
		...(isNetworkIdBtc(networkId)
			? [
					{
						step: SendStep.APPROVE,
						text: 'Approving...',
						state: 'next'
					} as ProgressStep
				]
			: []),
		{
			step: SendStep.SEND,
			text: 'Sending...',
			state: 'next'
		} as ProgressStep
	];
</script>

<InProgressWizard progressStep={sendProgressStep} {steps} />
