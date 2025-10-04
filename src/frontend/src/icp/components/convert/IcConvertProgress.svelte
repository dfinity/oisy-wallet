<script lang="ts">
	import { getContext } from 'svelte';
	import { sendSteps } from '$icp/constants/steps.constants';
	import { tokenCkErc20Ledger } from '$icp/derived/ic-token.derived';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		convertProgressStep?: string;
	}

	let { convertProgressStep = ProgressStepsSend.INITIALIZATION }: Props = $props();

	const { destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<InProgressWizard
	progressStep={convertProgressStep}
	steps={sendSteps({
		i18n: $i18n,
		networkId: $destinationToken.network.id,
		tokenCkErc20Ledger: $tokenCkErc20Ledger
	})}
/>
