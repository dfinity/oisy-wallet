<script lang="ts">
	import { sendSteps } from '$icp/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';

	export let sendProgressStep: string = ProgressStepsSendIc.INITIALIZATION;
</script>

<InProgressWizard progressStep={sendProgressStep} steps={sendSteps({ i18n: $i18n })} />
