<script lang="ts">
	import { getContext } from 'svelte';
	import { CMC_NAME } from '$icp/constants/cmc.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsCyclesMint } from '$lib/enums/progress-steps';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		progressStep: string;
	}

	let { progressStep }: Props = $props();

	const { sourceToken, destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let steps = $derived<ProgressSteps>([
		{
			step: ProgressStepsCyclesMint.INITIALIZATION,
			text: $i18n.convert.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsCyclesMint.TRANSFER,
			text: replacePlaceholders($i18n.cycles_mint.text.sending, {
				$token: $sourceToken.symbol,
				$minter: CMC_NAME
			}),
			state: 'next'
		},
		{
			step: ProgressStepsCyclesMint.MINT,
			text: replacePlaceholders($i18n.cycles_mint.text.minting, {
				$token: $destinationToken.symbol
			}),
			state: 'next'
		}
	]);
</script>

<InProgressWizard {progressStep} {steps} />
