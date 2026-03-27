<script lang="ts">
	import { getContext } from 'svelte';
	import { sendSteps } from '$icp/constants/steps.constants';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	interface Props {
		sendProgressStep?: string;
	}

	let { sendProgressStep = ProgressStepsSendIc.INITIALIZATION }: Props = $props();

	const { isIcBurning } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<InProgressWizard
	progressStep={sendProgressStep}
	steps={sendSteps({ i18n: $i18n, minting: $isIcMintingAccount, burning: $isIcBurning })}
/>
