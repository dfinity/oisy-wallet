<script lang="ts">
	import { sendSteps } from '$icp/constants/steps.constants';
	import { tokenCkErc20Ledger } from '$icp/derived/ic-token.derived';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';

	export let convertProgressStep: string = ProgressStepsSend.INITIALIZATION;
	export let networkId: NetworkId;
</script>

<InProgressWizard
	progressStep={convertProgressStep}
	steps={sendSteps({ i18n: $i18n, networkId, tokenCkErc20Ledger: $tokenCkErc20Ledger })}
/>
