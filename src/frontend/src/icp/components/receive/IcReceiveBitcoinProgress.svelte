<script lang="ts">
	import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import type { ProgressStep } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';

	export let receiveProgressStep: string = UpdateBalanceCkBtcStep.INITIALIZATION;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: UpdateBalanceCkBtcStep.INITIALIZATION,
			text: $i18n.receive.bitcoin.text.initializing,
			state: 'in_progress'
		} as ProgressStep,
		{
			step: UpdateBalanceCkBtcStep.RETRIEVE,
			text: $i18n.receive.bitcoin.text.checking_incoming,
			state: 'next'
		} as ProgressStep,
		{
			step: UpdateBalanceCkBtcStep.RELOAD,
			text: $i18n.receive.bitcoin.text.refreshing_wallet,
			state: 'next'
		} as ProgressStep
	];
</script>

<InProgressWizard progressStep={receiveProgressStep} {steps} />
