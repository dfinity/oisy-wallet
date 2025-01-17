<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSendSol, ProgressStepsSign } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	export let sendProgressStep: string = ProgressStepsSendSol.INITIALIZATION;

	let steps: ProgressSteps;
	$: steps = [
		{
			step: ProgressStepsSign.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsSign.SIGN,
			text: $i18n.send.text.signing_message,
			state: 'next'
		},
		{
			step: ProgressStepsSign.APPROVE,
			text: $i18n.send.text.approving,
			state: 'next'
		}
	];
</script>

<InProgressWizard progressStep={sendProgressStep} {steps} />
