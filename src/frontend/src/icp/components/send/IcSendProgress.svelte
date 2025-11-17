<script lang="ts">
	import { sendSteps } from '$icp/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		sendProgressStep?: string;
	}

	let { sendProgressStep = ProgressStepsSendIc.INITIALIZATION }: Props = $props();
</script>

<InProgressWizard progressStep={sendProgressStep} steps={sendSteps({ i18n: $i18n })} />
