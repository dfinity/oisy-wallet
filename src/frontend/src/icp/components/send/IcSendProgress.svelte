<script lang="ts">
	import { sendSteps } from '$icp/constants/steps.constants';
	import { tokenCkErc20Ledger } from '$icp/derived/ic-token.derived';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';

	export let sendProgressStep: string = ProgressStepsSendIc.INITIALIZATION;
	export let networkId: NetworkId | undefined = undefined;
</script>

<InProgressWizard
	progressStep={sendProgressStep}
	steps={sendSteps({ i18n: $i18n, networkId, tokenCkErc20Ledger: $tokenCkErc20Ledger })}
/>
