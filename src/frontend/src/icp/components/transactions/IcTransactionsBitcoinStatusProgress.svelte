<script lang="ts">
	import type { ProgressStep } from '@dfinity/gix-components';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsUpdateBalanceCkBtc } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		receiveProgressStep?: string;
	}

	let { receiveProgressStep = ProgressStepsUpdateBalanceCkBtc.INITIALIZATION }: Props = $props();

	let steps: ProgressSteps = $derived([
		{
			step: ProgressStepsUpdateBalanceCkBtc.INITIALIZATION,
			text: $i18n.receive.bitcoin.text.initializing,
			state: 'in_progress'
		} as ProgressStep,
		{
			step: ProgressStepsUpdateBalanceCkBtc.RETRIEVE,
			text: $i18n.receive.bitcoin.text.checking_incoming,
			state: 'next'
		} as ProgressStep,
		{
			step: ProgressStepsUpdateBalanceCkBtc.RELOAD,
			text: $i18n.receive.bitcoin.text.refreshing_wallet,
			state: 'next'
		} as ProgressStep
	]);
</script>

<InProgressWizard progressStep={receiveProgressStep} {steps} />
