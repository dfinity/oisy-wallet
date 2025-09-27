<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		sendProgressStep?: string;
	}

	let { sendProgressStep = ProgressStepsSendBtc.INITIALIZATION }: Props = $props();

	let steps: ProgressSteps = $derived([
		{
			step: ProgressStepsSendBtc.INITIALIZATION,
			text: $i18n.send.text.initializing_transaction,
			state: 'in_progress'
		},
		{
			step: ProgressStepsSendBtc.SEND,
			text: $i18n.send.text.sending,
			state: 'next'
		},
		{
			step: ProgressStepsSendBtc.RELOAD,
			text: $i18n.send.text.refreshing_ui,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={sendProgressStep} {steps} />
