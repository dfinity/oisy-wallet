<script lang="ts">
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { CMC_NAME } from '$icp/constants/cmc.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsCyclesTopUp } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressStep } from '$lib/types/progress-step';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		canisterId: string;
		progressStep: string;
		// Paid with ICP, the ICP goes to the CMC first, and the CMC then tops the canister up.
		paidWithIcp?: boolean;
	}

	let { canisterId, progressStep, paidWithIcp = false }: Props = $props();

	let transfer = $derived<ProgressStep[]>(
		paidWithIcp
			? [
					{
						step: ProgressStepsCyclesTopUp.TRANSFER,
						text: replacePlaceholders($i18n.cycles_mint.text.sending, {
							$token: ICP_TOKEN.symbol,
							$minter: CMC_NAME
						}),
						state: 'next'
					}
				]
			: []
	);

	let steps = $derived<ProgressSteps>([
		{
			step: ProgressStepsCyclesTopUp.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		...transfer,
		{
			step: ProgressStepsCyclesTopUp.TOP_UP,
			text: replacePlaceholders($i18n.cycles_top_up.text.topping_up, {
				$canister: shortenWithMiddleEllipsis({ text: canisterId })
			}),
			state: 'next'
		}
	]);
</script>

<InProgressWizard {progressStep} {steps} />
