<script lang="ts">
	import { sendSteps } from '$eth/constants/steps.constants';
	import { shouldSendWithApproval } from '$eth/utils/send.utils';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkErc20HelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token, TokenId } from '$lib/types/token';

	export let convertProgressStep: string = ProgressStepsSend.INITIALIZATION;
	export let destination = '';
	export let nativeEthereumToken: Token;
	export let sourceTokenId: TokenId;

	let sendWithApproval: boolean;
	$: sendWithApproval = shouldSendWithApproval({
		to: destination,
		tokenId: sourceTokenId,
		erc20HelperContractAddress: toCkErc20HelperContractAddress(
			$ckEthMinterInfoStore?.[nativeEthereumToken.id]
		)
	});
</script>

<InProgressWizard
	progressStep={convertProgressStep}
	steps={sendSteps({ i18n: $i18n, sendWithApproval })}
/>
